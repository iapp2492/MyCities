// my-cities-store.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { MyCitiesStoreService } from './my-cities-store.service';
import { MyCitiesApiService } from '../services/my-cities-api.service';
import { MyCityDto } from '../../../models/myCityDto';
import { BasemapMode } from '../../../models/basemapMode';
import { DebugLoggerService } from './debug-logger.service';
import { LocationFilterOption } from '../../../models/LocationFilterOption';

class MyCitiesApiServiceMock
{
    getAllCities = jasmine.createSpy('getAllCities');
    getActivePhotoKeys = jasmine.createSpy('getActivePhotoKeys');
    getStayDurations = jasmine.createSpy('getStayDurations');
    getDecades = jasmine.createSpy('getDecades');
    getLocationFilterOptions = jasmine.createSpy('getLocationFilterOptions');
}

class DebugLoggerServiceMock
{
    public log = jasmine.createSpy('log');
    public warn = jasmine.createSpy('warn');
    public debugTap<T>(label: string, formatter?: (value: T) => unknown)
    {
        void label;
        return (source: Observable<T>) =>
            source.pipe(
                tap(value =>
                {
                    formatter?.(value);
                })
            );
    }
}

function city(overrides: Partial<MyCityDto> & { city: string }): MyCityDto
{
    return {
        id: overrides.id ?? 0,
        city: overrides.city,
        country: overrides.country ?? 'Country',
        countryId: overrides.countryId ?? 0,
        region: overrides.region ?? '',
        regionId: overrides.regionId ?? 0,
        notes: overrides.notes ?? '',
        lat: overrides.lat ?? 0,
        lon: overrides.lon ?? 0,
        stayDuration: overrides.stayDuration ?? '',
        decades: overrides.decades ?? '',
        photoKey: overrides.photoKey ?? null,
    };
}

describe('MyCitiesStoreService', () =>
{
    let service: MyCitiesStoreService;
    let api: MyCitiesApiServiceMock;

    beforeEach(() =>
    {
        TestBed.configureTestingModule({
            providers: [
                MyCitiesStoreService,
                { provide: MyCitiesApiService, useClass: MyCitiesApiServiceMock },
                { provide: DebugLoggerService, useClass: DebugLoggerServiceMock },
            ],
        });

        service = TestBed.inject(MyCitiesStoreService);
        api = TestBed.inject(MyCitiesApiService) as unknown as MyCitiesApiServiceMock;
        
        api.getAllCities.and.returnValue(of([]));
        api.getActivePhotoKeys.and.returnValue(of([]));
        api.getStayDurations.and.returnValue(of([]));
        api.getDecades.and.returnValue(of([]));
        api.getLocationFilterOptions.and.returnValue(of([]));

    });

    it('starts with empty state', async () =>
    {
        const cities = await firstValueFrom(service.cities$.pipe(take(1)));
        const loading = await firstValueFrom(service.loading$.pipe(take(1)));
        const error = await firstValueFrom(service.error$.pipe(take(1)));
        const stays = await firstValueFrom(service.stayDurations$.pipe(take(1)));
        const decades = await firstValueFrom(service.decades$.pipe(take(1)));
        const stayFilter = await firstValueFrom(service.stayDurationFilter$.pipe(take(1)));
        const decadeFilter = await firstValueFrom(service.decadeFilter$.pipe(take(1)));
        const basemap = await firstValueFrom(service.basemapMode$.pipe(take(1)));

        expect(cities).toEqual([]);
        expect(loading).toBeFalse();
        expect(error).toBeNull();
        expect(stays).toEqual([]);
        expect(decades).toEqual([]);
        expect(stayFilter).toBeNull();
        expect(decadeFilter).toBeNull();
        expect(basemap).toBe('standard' as BasemapMode);
    });

    it('ensureLoaded calls API once, sets loading true then false, and populates cities + filter lists (filtering invalid coords)', (done) =>
    {
        const subj = new Subject<MyCityDto[]>();
        api.getAllCities.and.returnValue(subj.asObservable());

        const loadingStates: boolean[] = [];
        const staysStates: string[][] = [];
        const decadesStates: string[][] = [];

        const loadingSub = service.loading$.subscribe(v => loadingStates.push(v));
        const staysSub = service.stayDurations$.subscribe(v => staysStates.push(v));
        const decadesSub = service.decades$.subscribe(v => decadesStates.push(v));

        const c1 = city({ city: 'A', lat: 34.0, lon: -118.2, stayDuration: '1 mo', decades: '1990s, 2000s' });
        const c2 = city({ city: 'B', lat: 10.5, lon: 20.2, stayDuration: '3-5 mos', decades: '1980s; 1990s' });
        const bad1 = city({ city: 'BAD1', lat: Number.NaN, lon: 20, stayDuration: '2 mos', decades: '1970s' });
        const bad2 = city({ city: 'BAD2', lat: 10, lon: Number.POSITIVE_INFINITY, stayDuration: '1 yr', decades: '2010s' });


        service.ensureLoaded().subscribe({
            next: (cities) =>
            {
                // only valid coords should remain
                expect(cities.length).toBe(2);
                expect(cities.map(x => x.city)).toEqual(['A', 'B']);

                // filter lists derived from VALID cities only
                const lastStays = staysStates[staysStates.length - 1];
                const lastDecades = decadesStates[decadesStates.length - 1];

                expect(lastStays).toEqual(['1 mo', '3-5 mos']);
                expect(lastDecades).toEqual(['1980s', '1990s', '2000s']);

                // getAllCities called once
                expect(api.getAllCities).toHaveBeenCalledTimes(1);

                // should have warned about filtered out cities
                const logger = TestBed.inject(DebugLoggerService) as unknown as DebugLoggerServiceMock;
                expect(logger.warn).toHaveBeenCalled();

                done();
            },
            error: done.fail,
        });

        // ensureLoaded sets loading true immediately
        expect(loadingStates[loadingStates.length - 1]).toBeTrue();

        // complete the API
        subj.next([c1, c2, bad1, bad2]);
        subj.complete();

        // after completion, finalize should set loading false (will have emitted)
        setTimeout(() =>
        {
            expect(loadingStates[loadingStates.length - 1]).toBeFalse();

            loadingSub.unsubscribe();
            staysSub.unsubscribe();
            decadesSub.unsubscribe();
        });
    });

    it('ensureLoaded reuses in-flight request (API called once, same result delivered to multiple subscribers)', (done) =>
    {
        const subj = new Subject<MyCityDto[]>();
        api.getAllCities.and.returnValue(subj.asObservable());
        api.getActivePhotoKeys.and.returnValue(of([]));
        api.getStayDurations.and.returnValue(of([]));
        api.getDecades.and.returnValue(of([]));
        api.getLocationFilterOptions.and.returnValue(of([]));

        const obs1 = service.ensureLoaded();
        const obs2 = service.ensureLoaded();

        // same cached observable reference while in-flight
        expect(obs2).toBe(obs1);
        expect(api.getAllCities).toHaveBeenCalledTimes(1);

        const results1: MyCityDto[][] = [];
        const results2: MyCityDto[][] = [];

        obs1.subscribe({
            next: r => results1.push(r),
            error: done.fail,
        });

        obs2.subscribe({
            next: r => results2.push(r),
            error: done.fail,
        });

        const c1 = city({ city: 'A', lat: 1, lon: 2 });
        subj.next([c1]);
        subj.complete();

        setTimeout(() =>
        {
            expect(results1.length).toBe(1);
            expect(results2.length).toBe(1);
            expect(results1[0].map(x => x.city)).toEqual(['A']);
            expect(results2[0].map(x => x.city)).toEqual(['A']);
            done();
        });
    });

    it('ensureLoaded returns existing cities immediately without calling API again', async () =>
    {
        api.getAllCities.and.returnValue(of(
            [
                city({ city: 'A', lat: 1, lon: 2, stayDuration: '1 mo', decades: '1990s' }),
            ]));

        api.getActivePhotoKeys.and.returnValue(of([]));
        api.getStayDurations.and.returnValue(of([]));
        api.getDecades.and.returnValue(of([]));
        api.getLocationFilterOptions.and.returnValue(of([]));

        const first = await firstValueFrom(service.ensureLoaded());
        expect(first.map(x => x.city)).toEqual(['A']);
        expect(api.getAllCities).toHaveBeenCalledTimes(1);

        const second = await firstValueFrom(service.ensureLoaded());
        expect(second.map(x => x.city)).toEqual(['A']);
        expect(api.getAllCities).toHaveBeenCalledTimes(1);
    });

    it('ensureLoaded sets error and resets cache on API failure so later calls can retry', (done) =>
    {
        api.getAllCities.and.returnValue(throwError(() => new Error('boom')));

        service.ensureLoaded().subscribe({
            next: () => done.fail('expected error'),
            error: async () =>
            {
                const err = await firstValueFrom(service.error$.pipe(take(1)));
                expect(err).toBe('Failed to load cities');

                // now set up a successful retry
                api.getAllCities.calls.reset();
               api.getAllCities.and.returnValue(of(
                    [
                        city({ city: 'B', lat: 3, lon: 4, stayDuration: '2 mos', decades: '2000s' }),
                    ]));

                const cities = await firstValueFrom(service.ensureLoaded());
                expect(cities.map(x => x.city)).toEqual(['B']);
                expect(api.getAllCities).toHaveBeenCalledTimes(1);

                done();
            },
        });
    });

    it('refresh clears cached data and forces a reload', async () =>
    {
        api.getAllCities.and.returnValue(of(
            [
                city({ city: 'A', lat: 1, lon: 2, stayDuration: '1 mo', decades: '1990s' }),
            ]
        ));

        await firstValueFrom(service.ensureLoaded());
        expect(api.getAllCities).toHaveBeenCalledTimes(1);

        api.getAllCities.calls.reset();
        api.getAllCities.and.returnValue(of(
            [
                city({ city: 'B', lat: 3, lon: 4, stayDuration: '2 mos', decades: '2000s' }),
            ]
        ));

        const refreshed = await firstValueFrom(service.refresh());
        expect(refreshed.map(x => x.city)).toEqual(['B']);
        expect(api.getAllCities).toHaveBeenCalledTimes(1);
    });

    it('setStayDurationFilter trims and converts empty to null', async () =>
    {
        service.setStayDurationFilter('  3-5 mos  ');
        const v1 = await firstValueFrom(service.stayDurationFilter$.pipe(take(1)));
        expect(v1).toBe('3-5 mos');

        service.setStayDurationFilter('   ');
        const v2 = await firstValueFrom(service.stayDurationFilter$.pipe(take(1)));
        expect(v2).toBeNull();

        service.setStayDurationFilter(null);
        const v3 = await firstValueFrom(service.stayDurationFilter$.pipe(take(1)));
        expect(v3).toBeNull();
    });

    it('setDecadeFilter trims and converts empty to null', async () =>
    {
        service.setDecadeFilter('  1990s  ');
        const v1 = await firstValueFrom(service.decadeFilter$.pipe(take(1)));
        expect(v1).toBe('1990s');

        service.setDecadeFilter('   ');
        const v2 = await firstValueFrom(service.decadeFilter$.pipe(take(1)));
        expect(v2).toBeNull();

        service.setDecadeFilter(null);
        const v3 = await firstValueFrom(service.decadeFilter$.pipe(take(1)));
        expect(v3).toBeNull();
    });

    it('clearFilters sets both filters to null', async () =>
    {
        service.setStayDurationFilter('1 mo');
        service.setDecadeFilter('1990s');

        service.clearFilters();

        const stay = await firstValueFrom(service.stayDurationFilter$.pipe(take(1)));
        const decade = await firstValueFrom(service.decadeFilter$.pipe(take(1)));

        expect(stay).toBeNull();
        expect(decade).toBeNull();
    });

    it('setBasemapMode emits new basemap mode', async () =>
    {
        service.setBasemapMode('satellite' as BasemapMode);
        const mode = await firstValueFrom(service.basemapMode$.pipe(take(1)));
        expect(mode).toBe('satellite' as BasemapMode);
    });

    it('filteredCities$ filters by stayDuration and decade (including multi-valued decades)', async () =>
    {
         api.getAllCities.and.returnValue(of([
            city({ city: 'A', lat: 1, lon: 2, stayDuration: '1 mo', decades: '1990s, 2000s' }),
            city({ city: 'B', lat: 3, lon: 4, stayDuration: '2 mos', decades: '1980s;1990s' }),
            city({ city: 'C', lat: 5, lon: 6, stayDuration: '1 mo', decades: '2010s' }),
        ]));

        api.getActivePhotoKeys.and.returnValue(of([]));
        api.getStayDurations.and.returnValue(of(['1 mo', '2 mos']));
        api.getDecades.and.returnValue(of(['1980s', '1990s', '2000s', '2010s']));
        api.getLocationFilterOptions.and.returnValue(of([]));

        await firstValueFrom(service.ensureLoaded());

        // No filters => all
        let filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));
        expect(filtered.map(x => x.city)).toEqual(['A', 'B', 'C']);

        // Stay filter only
        service.setStayDurationFilter('1 mo');
        filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));
        expect(filtered.map(x => x.city)).toEqual(['A', 'C']);

        // Decade filter only
        service.setStayDurationFilter(null);
        service.setDecadeFilter('1990s');
        filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));
        expect(filtered.map(x => x.city)).toEqual(['A', 'B']);

        // Both filters
        service.setStayDurationFilter('1 mo');
        service.setDecadeFilter('2000s');
        filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));
        expect(filtered.map(x => x.city)).toEqual(['A']);
    });

    it('buildFilterLists produces unique, sorted stayDurations and decades', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'A', lat: 1, lon: 2, stayDuration: '3-5 mos', decades: '1990s, 2000s' }),
            city({ city: 'B', lat: 3, lon: 4, stayDuration: '1 mo', decades: '1980s' }),
            city({ city: 'C', lat: 5, lon: 6, stayDuration: '2 yrs', decades: '2010s|2020s' }),
            city({ city: 'D', lat: 7, lon: 8, stayDuration: '> 20 yrs', decades: '1970s; 1980s' }),
            city({ city: 'E', lat: 9, lon: 10, stayDuration: '1 yr', decades: '2000s' }),

            // NEW: hits yrRange in durationSortKey()
            city({ city: 'F', lat: 11, lon: 12, stayDuration: '10-19 yrs', decades: 'Unknown' }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        const stays = await firstValueFrom(service.stayDurations$.pipe(take(1)));
        const decades = await firstValueFrom(service.decades$.pipe(take(1)));

        // stay durations logical order (now includes yrRange bucket)
        expect(stays).toEqual(['1 mo', '3-5 mos', '1 yr', '2 yrs', '10-19 yrs', '> 20 yrs']);

        // decades chronological, with non-numeric decade sorted via alphaSort (typically ends up last)
        expect(decades).toEqual(['1970s', '1980s', '1990s', '2000s', '2010s', '2020s', 'Unknown']);
    });


    it('filteredCities$ returns [] when cities stream emits null/undefined (defensive guard)', async () =>
    {
        // Load something first so filteredCities$ is "live"
        api.getAllCities.and.returnValue(of([
            city({ city: 'A', lat: 1, lon: 2, stayDuration: '1 mo', decades: '1990s' }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        // Reflectively access the private subject that backs cities$
        // Adjust the key if your private field is named differently.
        const svcRecord = service as unknown as Record<string, unknown>;

        const citiesSubject =
            (svcRecord['citiesSubject'] ??
            svcRecord['_citiesSubject'] ??
            svcRecord['cities$Subject'] ??
            svcRecord['_cities$'] ??
            null) as unknown;

        // If this throws, the private field name doesn't match.
        // In that case: open the service and find the actual private subject name and use it here.
        (citiesSubject as BehaviorSubject<MyCityDto[] | null>).next(null);

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));
        expect(filtered).toEqual([]);
    });

    it('normalizeToken returns trimmed string and converts null/undefined to empty string', () =>
    {
        const svcRecord = service as unknown as Record<string, unknown>;
        const normalizeToken = svcRecord['normalizeToken'] as (value: unknown) => string;

        expect(normalizeToken('  abc  ')).toBe('abc');
        expect(normalizeToken(null)).toBe('');
        expect(normalizeToken(undefined)).toBe('');
    });

    it('splitMulti returns [] for empty input and splits multiple separators into tokens', () =>
    {
        const svcRecord = service as unknown as Record<string, unknown>;

        const result1 = (svcRecord['splitMulti'] as (value: unknown) => string[]).call(service, '');
        expect(result1).toEqual([]);

        const result2 = (svcRecord['splitMulti'] as (value: unknown) => string[]).call(service, '   ');
        expect(result2).toEqual([]);

        const result3 = (svcRecord['splitMulti'] as (value: unknown) => string[]).call(service, '1980s, 1990s;2000s/2010s|2020s');
        expect(result3).toEqual(['1980s', '1990s', '2000s', '2010s', '2020s']);

        const result4 = (svcRecord['splitMulti'] as (value: unknown) => string[]).call(service, ' , ; / | ');
        expect(result4).toEqual([]);
    });

    it('durationSortKey handles yrRange and unknown formats', () =>
    {
        const svcRecord = service as unknown as Record<string, unknown>;
        const durationSortKey = svcRecord['durationSortKey'] as (label: string) => number;

        // yrRange: 10-19 yrs -> key should be based on the first number in years, converted to months
        expect(durationSortKey('10-19 yrs')).toBe(10 * 12);

        // Unknown formats => POSITIVE_INFINITY
        expect(durationSortKey('n/a')).toBe(Number.POSITIVE_INFINITY);
        expect(durationSortKey('whatever')).toBe(Number.POSITIVE_INFINITY);
    });

   it('stayDurationSort uses localeCompare as a tie-breaker when keys are equal', () =>
    {
        const svcRecord = service as unknown as Record<string, unknown>;

        const result = (svcRecord['stayDurationSort'] as (a: string, b: string) => number).call(service, 'bbb', 'aaa');
        expect(result).toBeGreaterThan(0);
    });

    it('filteredCities$ excludes cities with empty decades when a decade filter is set (covers cDecadesRaw falsy branch)', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'HasDecades', lat: 1, lon: 2, stayDuration: '1 mo', decades: '1990s' }),
            city({ city: 'EmptyDecades', lat: 3, lon: 4, stayDuration: '1 mo', decades: '' }),
        ]));

        api.getActivePhotoKeys.and.returnValue(of([]));
        api.getStayDurations.and.returnValue(of([]));
        api.getDecades.and.returnValue(of([]));
        api.getLocationFilterOptions.and.returnValue(of([]));

        await firstValueFrom(service.ensureLoaded());

        service.setDecadeFilter('1990s');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));
        expect(filtered.map(x => x.city)).toEqual(['HasDecades']);
    });

    it('durationSortKey treats null/undefined label as empty string (covers label ?? "" branch)', () =>
    {
        const svcRecord = service as unknown as Record<string, unknown>;
        const durationSortKey = svcRecord['durationSortKey'] as (label: string) => number;

        expect(durationSortKey(null as unknown as string)).toBe(Number.POSITIVE_INFINITY);
        expect(durationSortKey(undefined as unknown as string)).toBe(Number.POSITIVE_INFINITY);
    });

    it('filteredCities$ treats undefined stayDuration and decades as empty strings', async () =>
    {
        const good: MyCityDto =
        {
            id: 1,
            city: 'Good',
            country: 'Country',
            countryId: 0,
            region: '',
            regionId: 0,
            notes: '',
            lat: 1,
            lon: 2,
            stayDuration: '1 mo',
            decades: '1990s',
            photoKey: null,
        };

        const noStay =
        {
            id: 2,
            city: 'NoStay',
            country: 'Country',
            countryId: 0,
            region: '',
            regionId: 0,
            notes: '',
            lat: 3,
            lon: 4,
            stayDuration: undefined,
            decades: '1990s',
            photoKey: null,
        } as unknown as MyCityDto;

        const noDecades =
        {
            id: 3,
            city: 'NoDecades',
            country: 'Country',
            countryId: 0,
            region: '',
            regionId: 0,
            notes: '',
            lat: 5,
            lon: 6,
            stayDuration: '1 mo',
            decades: undefined,
            photoKey: null,
        } as unknown as MyCityDto;

        api.getAllCities.and.returnValue(of([good, noStay, noDecades]));
        api.getStayDurations.and.returnValue(of([]));
        api.getDecades.and.returnValue(of([]));
        api.getLocationFilterOptions.and.returnValue(of([]));
        api.getActivePhotoKeys.and.returnValue(of([]));

        await firstValueFrom(service.ensureLoaded());

        service.setStayDurationFilter('1 mo');
        service.setDecadeFilter('1990s');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['Good']);
    });

    it('ensureLoaded loads location filter options', async () =>
    {
       const locationOptions: LocationFilterOption[] =
        [
            { filterType: 'region', filterId: 1, filterValue: 'region:1', filterLabel: 'Europe' },
            { filterType: 'country', filterId: 10, filterValue: 'country:10', filterLabel: 'France' },
        ];

        api.getAllCities.and.returnValue(of([
            city({ city: 'Paris', lat: 48.8566, lon: 2.3522 }),
        ]));

        api.getActivePhotoKeys.and.returnValue(of([]));
        api.getLocationFilterOptions.and.returnValue(of(locationOptions));

        await firstValueFrom(service.ensureLoaded());

        const locations = await firstValueFrom(service.locations$.pipe(take(1)));

        expect(api.getLocationFilterOptions).toHaveBeenCalled();
        expect(locations).toEqual(locationOptions);
    });

    it('setLocationFilter trims values and converts empty string to null', async () =>
    {
        service.setLocationFilter('  country:10  ');

        let value = await firstValueFrom(service.locationFilter$.pipe(take(1)));
        expect(value).toBe('country:10');

        service.setLocationFilter('   ');

        value = await firstValueFrom(service.locationFilter$.pipe(take(1)));
        expect(value).toBeNull();
    });

    it('filteredCities$ filters by country location', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'Paris', lat: 48, lon: 2, countryId: 10, regionId: 1 }),
            city({ city: 'Rome', lat: 41, lon: 12, countryId: 20, regionId: 1 }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        service.setLocationFilter('country:10');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['Paris']);
    });

    it('filteredCities$ filters by region location', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'Paris', lat: 48, lon: 2, countryId: 10, regionId: 1 }),
            city({ city: 'Tokyo', lat: 35, lon: 139, countryId: 30, regionId: 2 }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        service.setLocationFilter('region:1');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['Paris']);
    });

    it('filteredCities$ combines location filter with stay duration and decade filters', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'Paris', lat: 48, lon: 2, countryId: 10, regionId: 1, stayDuration: '1 mo', decades: '1990s, 2000s' }),
            city({ city: 'Lyon', lat: 45, lon: 4, countryId: 10, regionId: 1, stayDuration: '2 mos', decades: '1990s' }),
            city({ city: 'Rome', lat: 41, lon: 12, countryId: 20, regionId: 1, stayDuration: '1 mo', decades: '2000s' }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        service.setLocationFilter('country:10');
        service.setStayDurationFilter('1 mo');
        service.setDecadeFilter('2000s');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['Paris']);
    });

    it('hasPhotos returns true only for active positive photo keys', () =>
    {
        service.setActivePhotoKeys([1, 2, 0, -1, Number.NaN]);

        expect(service.hasPhotos(1)).toBeTrue();
        expect(service.hasPhotos(2)).toBeTrue();
        expect(service.hasPhotos(0)).toBeFalse();
        expect(service.hasPhotos(-1)).toBeFalse();
        expect(service.hasPhotos(null)).toBeFalse();
        expect(service.hasPhotos(undefined)).toBeFalse();
    });

    it('filteredCities$ filters by region location', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'A', regionId: 1, countryId: 10 }),
            city({ city: 'B', regionId: 2, countryId: 20 }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        service.setLocationFilter('region:1');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['A']);
    });

    it('filteredCities$ filters by country location', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'A', regionId: 1, countryId: 10 }),
            city({ city: 'B', regionId: 2, countryId: 20 }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        service.setLocationFilter('country:20');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['B']);
    });

    it('filteredCities$ ignores unknown location filter type', async () =>
    {
        api.getAllCities.and.returnValue(of([
            city({ city: 'A', regionId: 1, countryId: 10 }),
            city({ city: 'B', regionId: 2, countryId: 20 }),
        ]));

        await firstValueFrom(service.ensureLoaded());

        service.setLocationFilter('unknown:999');

        const filtered = await firstValueFrom(service.filteredCities$.pipe(take(1)));

        expect(filtered.map(x => x.city)).toEqual(['A', 'B']);
    });


});