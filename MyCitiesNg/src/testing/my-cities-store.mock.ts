import { BehaviorSubject, Observable, of } from 'rxjs';
import { BasemapMode } from '../models/basemapMode';     // adjust paths
import { MyCityDto } from '../models/myCityDto';

export class MyCitiesStoreMock 
{
    stayDurations$ = of<string[]>(['1 mo', '3-5 mos']);
    decades$ = of<string[]>(['1990s', '2000s']);

    private readonly _filteredCities = new BehaviorSubject<MyCityDto[] | null>(null);
    filteredCities$ = this._filteredCities.asObservable();

    private readonly _basemapMode = new BehaviorSubject<BasemapMode>('standard' as BasemapMode);
    basemapMode$ = this._basemapMode.asObservable();

    ensureLoaded(): Observable<void> 
    {
        return of(void 0);
    }

    setDecadeFilter = jasmine.createSpy('setDecadeFilter');
    setStayDurationFilter = jasmine.createSpy('setStayDurationFilter');
    setBasemapMode = jasmine.createSpy('setBasemapMode');

    emitCities(cities: MyCityDto[] | null): void 
    {
        this._filteredCities.next(cities);
    }

    emitBasemap(mode: BasemapMode): void 
    {
        this._basemapMode.next(mode);
    }
}
