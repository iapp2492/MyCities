import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, tap, map } from 'rxjs';
import { MyCityDto } from '../../../models/myCityDto';
import { MyCitiesApiService } from '../services/my-cities-api.service';
import { BasemapMode } from '../../../models/basemapMode';

@Injectable({ providedIn: 'root' })
export class MyCitiesStoreService 
{
    private api = inject(MyCitiesApiService);

    private readonly _citiesSubject = new BehaviorSubject<MyCityDto[]>([]);
    readonly cities$: Observable<MyCityDto[]> = this._citiesSubject.asObservable();

    private readonly _loadingSubject = new BehaviorSubject<boolean>(false);
    readonly loading$ = this._loadingSubject.asObservable();

    private readonly _errorSubject = new BehaviorSubject<string | null>(null);
    readonly error$ = this._errorSubject.asObservable();

    private readonly _stayDurationsSubject = new BehaviorSubject<string[]>([]);
    readonly stayDurations$ = this._stayDurationsSubject.asObservable();

    private readonly _decadesSubject = new BehaviorSubject<string[]>([]);
    readonly decades$ = this._decadesSubject.asObservable();

    private readonly _stayDurationFilterSubject = new BehaviorSubject<string | null>(null);
    readonly stayDurationFilter$ = this._stayDurationFilterSubject.asObservable();

    private readonly _decadeFilterSubject = new BehaviorSubject<string | null>(null);
    readonly decadeFilter$ = this._decadeFilterSubject.asObservable();

    private readonly _basemapModeSubject = new BehaviorSubject<BasemapMode>('standard');
    readonly basemapMode$ = this._basemapModeSubject.asObservable();

    readonly filteredCities$ = combineLatest(
        [
            this.cities$,
            this.stayDurationFilter$,
            this.decadeFilter$
        ]).pipe(
            tap(([cities, stay, decade]) => console.log('Combining cities with filters (values):', { citiesCount: cities?.length, stay, decade })),
            map(([cities, stay, decade]) => 
            {
                if (!cities) 
                {
                    return [];
                }

                return cities.filter(c => 
                {
                    const cStay = String(c.stayDuration ?? '').trim();
                    const cDecadesRaw = String(c.decades ?? '').trim();

                    const stayOk = !stay || cStay === stay;

                    // decades can be multi-valued; reuse the split helper
                    const decades = cDecadesRaw
                        ? this.splitMulti(cDecadesRaw)
                        : [];

                    const decadeOk = !decade || decades.includes(decade);

                    return stayOk && decadeOk;
                });
            }),
            shareReplay({ bufferSize: 1, refCount: false })
        );

    private _loadOnce$?: Observable<MyCityDto[]>;

    // Call this from ANY map component. First call hits the API; later calls reuse cached result.  
    ensureLoaded(): Observable<MyCityDto[]> 
    {
        // If we already have cities in memory, return them immediately.
        const existing = this._citiesSubject.value;
        if (existing.length > 0)
        {
            return of(existing);
        }

        // If a request is already in-flight / cached, reuse it.
        if (this._loadOnce$) 
        {
            return this._loadOnce$;
        }

        this._loadingSubject.next(true);
        this._errorSubject.next(null);

        this._loadOnce$ = this.api.getAllCities().pipe(
            tap(cities => 
            {
                const valid = cities.filter(c =>
                    this.isValidCoordinate(c.lat) &&
                    this.isValidCoordinate(c.lon)
                );
                if (valid.length !== cities.length)
                {
                    console.warn(
                        `Filtered out ${cities.length - valid.length} cities due to invalid coordinates`
                    );
                }
                
                this._citiesSubject.next(valid);
                this.buildFilterLists(valid);
            }),
            catchError(err => 
            {
                this._errorSubject.next('Failed to load cities');
                // Reset so a later call can retry
                this._loadOnce$ = undefined;
                return throwError(() => err);
            }),
            finalize(() => this._loadingSubject.next(false)),

            // shareReplay makes ALL subscribers share the same HTTP call + cache the last value
            shareReplay({ bufferSize: 1, refCount: false })
        );

        return this._loadOnce$;
    }

    private isValidCoordinate(value: unknown): boolean
    {
        return Number.isFinite(Number(value));
    }


    // In case we ever implement a manual refresh button. 
    // This clears the cache and forces a reload on next ensureLoaded() call.   
    refresh(): Observable<MyCityDto[]> 
    {
        this._citiesSubject.next([]);
        this._stayDurationsSubject.next([]);
        this._decadesSubject.next([]);
        this._loadOnce$ = undefined;
        return this.ensureLoaded();
    }

    setStayDurationFilter(value: string | null): void 
    {
        const v = (value ?? '').trim();
        this._stayDurationFilterSubject.next(v === '' ? null : v);
    }

    setDecadeFilter(value: string | null): void 
    {
        const v = (value ?? '').trim();
        this._decadeFilterSubject.next(v === '' ? null : v);
    }

    clearFilters(): void 
    {
        this._stayDurationFilterSubject.next(null);
        this._decadeFilterSubject.next(null);
    }

    setBasemapMode(mode: BasemapMode): void 
    {
        this._basemapModeSubject.next(mode);
    }

    private normalizeToken(value: unknown): string 
    {
        return String(value ?? '').trim();
    }

    /** Splits things like "1980s, 1990s; 2000s" into ["1980s","1990s","2000s"] */
    private splitMulti(value: unknown): string[] 
    {
        const s = this.normalizeToken(value);
        if (!s) 
        {
            return [];
        }
        return s
            .split(/[,;/|]+/g)     // comma, semicolon, slash, pipe
            .map(x => x.trim())
            .filter(Boolean);
    }

    private alphaSort(a: string, b: string): number 
    {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }

    // This sorts our decades in chronological order (e.g., 1970s, 1980s...) */
    private decadeSort(a: string, b: string): number 
    {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) 
        {
            return na - nb;
        }
        return this.alphaSort(a, b);
    }

    // This sorts our stay durations in a logical order (e.g., 1 mo, 2 mos, 3-5 mos, 1 yr, 2 yrs, >20 yrs)
    // The whole point of this app is to list cities where I have lived for a minimum of one continuous month.
    // so these stay durations are all based on that minimum threshold and are meant to be human-friendly labels, not precise durations.
    private durationSortKey(label: string): number 
    {
        const s = (label ?? '').trim().toLowerCase();

        // > 20 yr  (or >20 yr, > 20 yrs, etc)
        const gt = s.match(/^>\s*(\d+)\s*yr/);
        if (gt) 
        {
            return (parseInt(gt[1], 10) + 0.5) * 12;
        } // put it after 20 yrs

        // Range months: 3-5 mos, 6 - 11 mos
        const mosRange = s.match(/^(\d+)\s*-\s*(\d+)\s*mo/);
        if (mosRange) 
        {
            return parseInt(mosRange[1], 10);
        } // sort by start of range

        // Single months: 1 mo, 2 mos
        const mosSingle = s.match(/^(\d+)\s*mo/);
        if (mosSingle) 
        {
            return parseInt(mosSingle[1], 10);
        }

        // Range years: 3-5 yrs, 10-19 yrs
        const yrRange = s.match(/^(\d+)\s*-\s*(\d+)\s*yr/);
        if (yrRange) 
        {
            return parseInt(yrRange[1], 10) * 12;
        }

        // Single years: 1 yr, 2 yrs
        const yrSingle = s.match(/^(\d+)\s*yr/);
        if (yrSingle) 
        {
            return parseInt(yrSingle[1], 10) * 12;
        }

        // Unknown formats go to the bottom
        return Number.POSITIVE_INFINITY;
    }

    private stayDurationSort(a: string, b: string): number 
    {
        const ka = this.durationSortKey(a);
        const kb = this.durationSortKey(b);
        if (ka !== kb) 
        {
            return ka - kb;
        }
        // tie-breaker (keeps stable, reasonable ordering if two map to same key)
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }

    // Builds the lists of unique stay durations and decades for the filter dropdowns.
    private buildFilterLists(cities: MyCityDto[]): void 
    {
        const staySet = new Set<string>();  //Sets automatically handle uniqueness for us
        const decadeSet = new Set<string>();

        for (const c of cities) 
        {
            // StayDuration: always a single value
            const stay = this.normalizeToken(c.stayDuration);
            if (stay) 
            {
                staySet.add(stay);
            }

            // Decades: in some cases are multi-value 
            for (const d of this.splitMulti(c.decades)) 
            {
                decadeSet.add(d);
            }
        }

        const stayDurations = Array.from(staySet).sort((a, b) => this.stayDurationSort(a, b));
        const decades = Array.from(decadeSet).sort((a, b) => this.decadeSort(a, b));

        // Trigger updates to the filteredCities$ stream by emitting new lists 
        // (even if the actual values haven't changed, which is unlikely since these are derived from the data)
        this._stayDurationsSubject.next(stayDurations);
        this._decadesSubject.next(decades);
    }

}