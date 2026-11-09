import { BehaviorSubject, Observable, of } from 'rxjs';
import { BasemapSelections, DEFAULT_BASEMAPS } from '../models/basemapMode';
import { MyCityDto } from '../models/myCityDto';

export class MyCitiesStoreMock 
{
    stayDurations$ = of<string[]>(['1 mo', '3-5 mos']);
    decades$ = of<string[]>(['1990s', '2000s']);

    private readonly _filteredCities = new BehaviorSubject<MyCityDto[] | null>(null);
    filteredCities$ = this._filteredCities.asObservable();

    ensureLoaded(): Observable<void> 
    {
        return of(void 0);
    }

    setDecadeFilter = jasmine.createSpy('setDecadeFilter');
    setStayDurationFilter = jasmine.createSpy('setStayDurationFilter');
    private selections: BasemapSelections = {...DEFAULT_BASEMAPS};
    getBasemapMode<E extends keyof BasemapSelections>(engine: E): BasemapSelections[E]
    {
        return this.selections[engine];
    }
    setBasemapMode = jasmine.createSpy('setBasemapMode').and.callFake(
        <E extends keyof BasemapSelections>(engine: E, mode: BasemapSelections[E]) =>
        {
            this.selections = {...this.selections, [engine]: mode};
        }
    );

    emitCities(cities: MyCityDto[] | null): void
    {
        this._filteredCities.next(cities);
    }
}
