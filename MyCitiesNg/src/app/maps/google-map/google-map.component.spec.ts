import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of, throwError, filter  } from 'rxjs';
import { GoogleMapComponent } from './google-map.component';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import type { MyCityDto } from '../../../models/myCityDto';
import type { BasemapMode } from '../../../models/basemapMode';
import { MapHintPresenter, MapHintService } from '../../core/services/map-hint.service';
import { MatSnackBar } from '@angular/material/snack-bar';

class MockAdvancedMarkerElement
{
    public map: google.maps.Map | null;
    public position: google.maps.marker.AdvancedMarkerElementOptions['position'];
    public content?: Node;

    private readonly clickHandlers: (() => void)[] = [];

    public constructor(options: google.maps.marker.AdvancedMarkerElementOptions)
    {
        this.map = options.map ?? null;
        this.position = options.position;
        this.content = options.content ?? undefined;
    }

    public addListener(eventName: string, handler: () => void): void
    {
        if (eventName === 'click')
        {
            this.clickHandlers.push(handler);
        }
    }

    public triggerClick(): void
    {
        for (const h of this.clickHandlers)
        {
            h();
        }
    }
}

class TestCitiesStoreMock
{
    private readonly filteredCitiesSubject = new BehaviorSubject<MyCityDto[] | null>(null);

    public stayDurations$ = of<string[]>(['1-3 days', '1 week']);
    public decades$ = of<string[]>(['1990s', '2000s']);
    public filteredCities$ = this.filteredCitiesSubject.asObservable();

    public setDecadeFilter = jasmine.createSpy('setDecadeFilter');
    public setStayDurationFilter = jasmine.createSpy('setStayDurationFilter');
    public setBasemapMode = jasmine.createSpy('setBasemapMode');

    public ensureLoaded(): Observable<void>
    {
        return of(void 0);
    }

    public emitFilteredCities(value: MyCityDto[] | null): void
    {
        this.filteredCitiesSubject.next(value);
    }
}

class GoogleMapsLoaderMock
{
    public setOptions = jasmine.createSpy('setOptions');

    public importLibrary = jasmine.createSpy('importLibrary').and.callFake(async (lib: string) =>
    {
        if (lib === 'maps')
        {
            return {
                Map: (globalThis as unknown as { google: typeof google }).google.maps.Map
            };
        }

        return {};
    });
}

class TestCitiesStoreManualLoadMock extends TestCitiesStoreMock
{
    private readonly ensureLoadedSubject = new BehaviorSubject<void | null>(null);

    public override ensureLoaded(): Observable<void>
    {
        // never emits "void 0" unless we push it
        return this.ensureLoadedSubject.pipe(
            filter((v): v is void => v === void 0)
        );
    }

    public releaseEnsureLoaded(): void
    {
        this.ensureLoadedSubject.next(void 0);
    }
}

class MatSnackBarMock
{
    public open = jasmine.createSpy('open').and.callFake((_message: string) =>
    {
        void _message;
        return {} as unknown;
    });
}

class MapHintServiceMock
{
    public showOnceIfNeeded = jasmine.createSpy('showOnceIfNeeded');
}

interface GoogleMocks
{
    mapInstance: google.maps.Map;
    infoWindowInstance: google.maps.InfoWindow;
    boundsInstance: google.maps.LatLngBounds;
    createdMarkers: MockAdvancedMarkerElement[];
    fitBoundsSpy: jasmine.Spy;
    setMapTypeIdSpy: jasmine.Spy;
    getMapCtorOptions(): google.maps.MapOptions | null;
    triggerIdle(): void;
    reset(): void;
}

function installGoogleMapsMocks(): GoogleMocks
{
    const createdMarkers: MockAdvancedMarkerElement[] = [];
    const fitBoundsSpy = jasmine.createSpy('fitBounds');
    const setMapTypeIdSpy = jasmine.createSpy('setMapTypeId');

    let mapCtorOptions: google.maps.MapOptions | null = null;
    let idleHandler: (() => void) | null = null;

    const addListenerOnceSpy = jasmine.createSpy('addListenerOnce')
        .and.callFake((_instance: unknown, eventName: string, handler: () => void) =>
        {
            void _instance;
            void eventName; 
            void handler;

            if (eventName === 'idle')
            {
                idleHandler = handler;
            }

            return { remove: () => void 0 };
        });

    const mapInstance =
    {
        fitBounds: fitBoundsSpy,
        setMapTypeId: setMapTypeIdSpy,
    } as unknown as google.maps.Map;

    const infoWindowInstance =
    {
        setContent: jasmine.createSpy('setContent'),
        open: jasmine.createSpy('open'),
    } as unknown as google.maps.InfoWindow;

    const boundsInstance =
    {
        extend: jasmine.createSpy('extend'),
    } as unknown as google.maps.LatLngBounds;


    const globalRecord = globalThis as unknown as Record<string, unknown>;

    const googleMock =
    {
        maps:
        {
            event:
            {
                addListenerOnce: addListenerOnceSpy
            },
            Map: function MockMapCtor(_el: HTMLElement, _opts: unknown)
            {
                void _el;
                mapCtorOptions = _opts as google.maps.MapOptions;
                return mapInstance;
            },
            InfoWindow: function MockInfoWindowCtor()
            {
                return infoWindowInstance;
            },
            LatLngBounds: function MockLatLngBoundsCtor()
            {
                return boundsInstance;
            },
            marker:
            {
                AdvancedMarkerElement: function MockAdvancedMarkerCtor(
                    options: google.maps.marker.AdvancedMarkerElementOptions
                )
                {
                    const marker = new MockAdvancedMarkerElement(options);
                    createdMarkers.push(marker);
                    return marker;
                },
            },
        },
    };

    globalRecord['google'] = googleMock;

    return {
        mapInstance,
        infoWindowInstance,
        boundsInstance,
        createdMarkers,
        fitBoundsSpy,
        setMapTypeIdSpy,
        getMapCtorOptions: () => mapCtorOptions,
        triggerIdle: () =>
        {
            idleHandler?.();
        },
        reset: () =>
        {
            idleHandler = null;
            mapCtorOptions = null;
            createdMarkers.length = 0;
            fitBoundsSpy.calls.reset();
            setMapTypeIdSpy.calls.reset();
        }
    };
}

describe('GoogleMapComponent', () =>
{
    let component: GoogleMapComponent;
    let fixture: ComponentFixture<GoogleMapComponent>;
    let store: TestCitiesStoreMock;
    let g: GoogleMocks;
    let mapsLoader: GoogleMapsLoaderMock;
    let host: HTMLDivElement;


    beforeEach(async () =>
    {
        // Ensure the map element exists before initMapOnce() is called
        host = document.createElement('div');
        host.id = 'test-host';
        host.innerHTML = `<div id="googleMap" style="width: 400px; height: 300px;"></div>`;
        document.body.appendChild(host);

        g = installGoogleMapsMocks();
        g.reset();
        store = new TestCitiesStoreMock();

        await TestBed.configureTestingModule(
        {
            imports: [GoogleMapComponent],
            providers: [
                { provide: MyCitiesStoreService, useValue: store },
                { provide: GoogleMapsLoaderService, useClass: GoogleMapsLoaderMock },
                { provide: MapHintService, useClass: MapHintServiceMock },
                { provide: MatSnackBar, useClass: MatSnackBarMock },
            ]
        }).compileComponents();

        mapsLoader = TestBed.inject(GoogleMapsLoaderService) as unknown as GoogleMapsLoaderMock;

        fixture = TestBed.createComponent(GoogleMapComponent);
        component = fixture.componentInstance;
    });

    afterEach(() =>
    {
        (component as unknown as { map?: google.maps.Map }).map = undefined;
        host?.remove();
        fixture?.destroy();
    });

    it('should create', () =>
    {
        expect(component).toBeTruthy();
    });

    it('initMapOnce should do nothing when map element is missing', async () =>
    {
        const original = document.getElementById.bind(document);

        spyOn(document, 'getElementById').and.callFake((id: string) =>
        {
            if (id === 'googleMap')
            {
                return null;
            }

            return original(id);
        });
        mapsLoader.setOptions.calls.reset();
        mapsLoader.importLibrary.calls.reset();

        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        expect(mapsLoader.setOptions).not.toHaveBeenCalled();
        expect(mapsLoader.importLibrary).not.toHaveBeenCalled();
    });

    it('initMapOnce should create the map and infowindow once', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        expect(mapsLoader.setOptions).toHaveBeenCalledTimes(1);
        expect(mapsLoader.importLibrary).toHaveBeenCalledWith('maps');
        expect(mapsLoader.importLibrary).toHaveBeenCalledWith('marker');

        const map = (component as unknown as { map?: google.maps.Map }).map;
        expect(map).toBeDefined();
    });

    it('onBasemapChange should call store + setMapTypeId when map exists', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        component.onBasemapChange('satellite');

        expect(store.setBasemapMode).toHaveBeenCalledWith('satellite' as BasemapMode);
        expect(g.setMapTypeIdSpy).toHaveBeenCalledWith('satellite' as unknown as google.maps.MapTypeId);
    });

    it('onBasemapChange should return early (no setMapTypeId) when map does not exist', () =>
    {
        component.onBasemapChange('terrain');

        expect(store.setBasemapMode).toHaveBeenCalledWith('terrain' as BasemapMode);
        expect(g.setMapTypeIdSpy).not.toHaveBeenCalled();
    });

    it('renderMarkers should skip cities with null lat/lon and fit bounds for valid ones', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        const cities: MyCityDto[] =
        [
            createCity({ id: 1, city: 'A', country: 'X', lat: 10, lon: 20 }),
            createCity({ id: 2, city: 'B', country: 'Y', lat: undefined, lon: 30 }),
            createCity({ id: 3, city: 'C', country: 'Z', lat: 40, lon: undefined }),
            createCity({ id: 4, city: 'D', country: 'W', lat: -5, lon: 100 }),
        ];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities);

        expect(g.createdMarkers.length).toBe(2);
        expect(g.fitBoundsSpy).toHaveBeenCalledTimes(1);

        // bounds.extend called once per valid city
        expect((g.boundsInstance as unknown as { extend: jasmine.Spy }).extend).toHaveBeenCalledTimes(2);
    });

    function createCity(overrides?: Partial<MyCityDto>): MyCityDto
    {
        const base: MyCityDto =
        {
            id: 1,
            city: 'X',
            country: 'Y',
            region: '',
            lat: 0,
            lon: 0,
            stayDuration: '',
            decades: '',
            notes: '',
            photoKey: null
        };

        return {
            ...base,
            ...overrides
        };
    }


    it('renderMarkers should clear previous markers by setting m.map = null', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        const cities1: MyCityDto[] =
        [
            { city: 'A', country: 'X', lat: 1, lon: 2 } as MyCityDto,
            { city: 'B', country: 'X', lat: 3, lon: 4 } as MyCityDto,
        ];

        const cities2: MyCityDto[] =
        [
            { city: 'C', country: 'X', lat: 5, lon: 6 } as MyCityDto,
        ];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities1);

        const firstBatch = [...g.createdMarkers];
        expect(firstBatch.length).toBe(2);

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities2);

        // After second render, first markers should have been detached
        expect(firstBatch[0].map).toBeNull();
        expect(firstBatch[1].map).toBeNull();
    });

    it('marker click should set InfoWindow content and open it', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        const cities: MyCityDto[] =
        [
            { city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, stayDuration: '1 week', decades: '2010s' } as MyCityDto,
        ];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities);

        expect(g.createdMarkers.length).toBe(1);

        const marker = g.createdMarkers[0];
        marker.triggerClick();

        const iw = g.infoWindowInstance as unknown as { setContent: jasmine.Spy; open: jasmine.Spy };
        expect(iw.setContent).toHaveBeenCalled();
        expect(iw.open).toHaveBeenCalled();
    });

    it('ngAfterViewInit should render markers after filteredCities$ emits and map is ready', async () =>
    {
        // Arrange: emit AFTER view init kicks off
        fixture.detectChanges();

        // initMapOnce is async and called from ensureLoaded subscription
        // We allow microtasks to flush by awaiting a resolved promise twice.
        await Promise.resolve();
        await Promise.resolve();

        const cities: MyCityDto[] =
        [
            { city: 'A', country: 'X', lat: 10, lon: 20 } as MyCityDto,
        ];

        store.emitFilteredCities(cities);

        await Promise.resolve();
        await Promise.resolve();

        expect(g.createdMarkers.length).toBe(1);
        expect(g.fitBoundsSpy).toHaveBeenCalled();
    });

    it('ngOnDestroy should clear markers and unset map reference', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        const cities: MyCityDto[] =
        [
            { city: 'A', country: 'X', lat: 10, lon: 20 } as MyCityDto,
        ];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities);
        expect(g.createdMarkers.length).toBe(1);

        component.ngOnDestroy();

        expect(g.createdMarkers[0].map).toBeNull();

        const map = (component as unknown as { map?: google.maps.Map }).map;
        expect(map).toBeUndefined();
    });

    it('onDecadeChange should store selection and call store with empty string when null', () =>
    {
        component.onDecadeChange(null);

        expect(store.setDecadeFilter).toHaveBeenCalledWith('');
    });

    it('onStayChange should store selection and call store with empty string when null', () =>
    {
        component.onStayChange(null);

        expect(store.setStayDurationFilter).toHaveBeenCalledWith('');
    });

   it('ngAfterViewInit should store latestCities but not render markers when map is not ready yet', async () =>
    {
        const manualStore = new TestCitiesStoreManualLoadMock();

        await TestBed.resetTestingModule();

        await TestBed.configureTestingModule(
        {
            imports: [GoogleMapComponent],
            providers:
            [
                { provide: MyCitiesStoreService, useValue: manualStore },
                { provide: GoogleMapsLoaderService, useClass: GoogleMapsLoaderMock }
            ]
        }).compileComponents();

        const localFixture = TestBed.createComponent(GoogleMapComponent);
        const localComponent = localFixture.componentInstance;

        localFixture.detectChanges(); // ngAfterViewInit runs, BUT ensureLoaded() does not emit => map not initialized

        const cities: MyCityDto[] =
        [
            createCity({ id: 10, city: 'Early', country: 'X', lat: 1, lon: 2 })
        ];

        manualStore.emitFilteredCities(cities);

        await Promise.resolve();
        await Promise.resolve();

        // Still no map => no markers
        expect(g.createdMarkers.length).toBe(0);

        const latestCities = (localComponent as unknown as { latestCities: MyCityDto[] | null }).latestCities;
        expect(latestCities).toEqual(cities);
    });

    it('initMapOnce should render markers if latestCities already exists', async () =>
    {
        const latestCities: MyCityDto[] =
        [
            createCity({ id: 11, city: 'Stored', country: 'X', lat: 10, lon: 20 })
        ];

        (component as unknown as { latestCities: MyCityDto[] | null }).latestCities = latestCities;

        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        expect(g.createdMarkers.length).toBe(1);
    });

    it('renderMarkers should return early when map is undefined', () =>
    {
        const cities: MyCityDto[] =
        [
            createCity({ id: 12, city: 'NoMap', country: 'X', lat: 1, lon: 2 })
        ];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities);

        expect(g.createdMarkers.length).toBe(0);
        expect(g.fitBoundsSpy).not.toHaveBeenCalled();
    });

    it('renderMarkers should clear markers then return early when cities is empty', async () =>
    {
        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        const cities1: MyCityDto[] =
        [
            createCity({ id: 13, city: 'A', country: 'X', lat: 1, lon: 2 })
        ];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers(cities1);
        expect(g.createdMarkers.length).toBe(1);

        const firstMarker = g.createdMarkers[0];

        (component as unknown as { renderMarkers(c: MyCityDto[]): void }).renderMarkers([]);

        // It should have cleared previous marker
        expect(firstMarker.map).toBeNull();
        // No new markers
        expect(g.createdMarkers.length).toBe(1);
    });

    it('createMarkerElement should change opacity on mouseenter and mouseleave', () =>
    {
        const el = (component as unknown as { createMarkerElement(): HTMLElement }).createMarkerElement();

        expect(el.style.opacity).toBe('0.72');

        el.dispatchEvent(new Event('mouseenter'));
        expect(el.style.opacity).toBe('1');

        el.dispatchEvent(new Event('mouseleave'));
        expect(el.style.opacity).toBe('0.72');
    });

    it('ngAfterViewInit should call initMapOnce even when ensureLoaded errors', async () =>
    {
        const erroringStore = new TestCitiesStoreMock();
        spyOn(erroringStore, 'ensureLoaded').and.returnValue(throwError(() => new Error('boom')));

        await TestBed.resetTestingModule();

        await TestBed.configureTestingModule(
        {
            imports: [GoogleMapComponent],
            providers:
            [
                { provide: MyCitiesStoreService, useValue: erroringStore },
                { provide: GoogleMapsLoaderService, useClass: GoogleMapsLoaderMock }
            ]
        }).compileComponents();

        const localFixture = TestBed.createComponent(GoogleMapComponent);
        localFixture.detectChanges();

        await Promise.resolve();
        await Promise.resolve();

        const localMapsLoader = TestBed.inject(GoogleMapsLoaderService) as unknown as GoogleMapsLoaderMock;
        expect(localMapsLoader.setOptions).toHaveBeenCalled();
    });

    it('initMapOnce should use roadmap when selectedBasemap is null', async () =>
    {
        (component as unknown as { selectedBasemap: string | null }).selectedBasemap = null;

        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        const opts = g.getMapCtorOptions();
        expect(opts).not.toBeNull();
        expect(opts?.mapTypeId).toBe('roadmap' as unknown as google.maps.MapTypeId);
    });

    it('initMapOnce idle event should call showOnceIfNeeded and open snackbar via presenter', async () =>
    {
        const hintService = TestBed.inject(MapHintService) as unknown as MapHintServiceMock;
        const snackBar = TestBed.inject(MatSnackBar) as unknown as MatSnackBarMock;

        hintService.showOnceIfNeeded.and.callFake((_engine: string, presenter: MapHintPresenter) =>
        {
            presenter.showHint('Tip: Tap a marker to see city details.');
        });

        await (component as unknown as { initMapOnce(): Promise<void> }).initMapOnce();

        // The component wires the idle listener; we trigger it explicitly.
        g.triggerIdle();

        expect(hintService.showOnceIfNeeded).toHaveBeenCalled();

        const args = hintService.showOnceIfNeeded.calls.mostRecent().args;
        expect(args[0]).toBe('google');

        expect(snackBar.open).toHaveBeenCalledWith(
            'Tip: Tap a marker to see city details.',
            'Got it',
            {
                duration: 8000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['mycities-toast']
            }
        );
    });

});
