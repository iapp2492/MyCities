import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { MapboxMapComponent } from './mapbox-map.component';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import type { MyCityDto } from '../../../models/myCityDto';
import type { BasemapMode } from '../../../models/basemapMode';
import { MAPBOX_FACTORY } from '../../core/map/mapbox.factory';
import type { MapboxFactory } from '../../core/map/mapbox.factory';


type LoadHandler = () => void;

interface MapboxMapLike
{
    on(event: 'load', handler: LoadHandler): void;
    once(event: 'load' | 'style.load', handler: LoadHandler): void;

    setStyle(style: string): void;
    fitBounds(bounds: unknown, options?: unknown): void;

    addControl(control: unknown, position?: unknown): void;
    resize(): void;
    remove(): void;
}

type MapboxMapLikeSpy = Omit<MapboxMapLike, 'on' | 'once' | 'setStyle' | 'fitBounds' | 'addControl' | 'resize' | 'remove'> &
{
    on: jasmine.Spy;
    once: jasmine.Spy;
    setStyle: jasmine.Spy;
    fitBounds: jasmine.Spy;
    addControl: jasmine.Spy;
    resize: jasmine.Spy;
    remove: jasmine.Spy;
};


interface MarkerLike
{
    setLngLat(lngLat: [number, number]): MarkerLike;
    setPopup(popup: mapboxgl.Popup): MarkerLike;
    addTo(map: mapboxgl.Map): MarkerLike;
    remove(): void;
}

interface PopupLike
{
    setHTML(html: string): PopupLike;
}

interface BoundsLike
{
    extend(lngLat: [number, number]): void;
}

class MyCitiesStoreMock
{
    stayDurations$ = of<string[]>(['1 mo', '3-5 mos']);
    decades$ = of<string[]>(['1990s', '2000s']);

    private readonly filteredCitiesSubject = new BehaviorSubject<MyCityDto[] | null>(null);
    filteredCities$ = this.filteredCitiesSubject.asObservable();

    ensureLoaded(): Observable<void>
    {
        return of(void 0);
    }

    setDecadeFilter = jasmine.createSpy('setDecadeFilter');
    setStayDurationFilter = jasmine.createSpy('setStayDurationFilter');
    setBasemapMode = jasmine.createSpy('setBasemapMode');

    emitCities(cities: MyCityDto[] | null): void
    {
        this.filteredCitiesSubject.next(cities);
    }
}

function createFakeMap(): { map: MapboxMapLikeSpy; handlers: { load?: LoadHandler; styleLoad?: LoadHandler } }
{
    const handlers: { load?: LoadHandler; styleLoad?: LoadHandler } = {};

    const map: MapboxMapLikeSpy =
    {
        on: jasmine.createSpy('on').and.callFake((event: 'load', handler: LoadHandler) =>
        {
            if (event === 'load')
            {
                handlers.load = handler;
            }
        }),

        once: jasmine.createSpy('once').and.callFake((event: 'load' | 'style.load', handler: LoadHandler) =>
        {
            if (event === 'load')
            {
                handlers.load = handler;
            }

            if (event === 'style.load')
            {
                handlers.styleLoad = handler;
            }
        }),

        setStyle: jasmine.createSpy('setStyle'),
        fitBounds: jasmine.createSpy('fitBounds'),
        addControl: jasmine.createSpy('addControl'),
        resize: jasmine.createSpy('resize'),
        remove: jasmine.createSpy('remove'),
    };

    return { map, handlers };
}


function createFakeMarker(): MarkerLike
{
    const marker: MarkerLike =
    {
        setLngLat: jasmine.createSpy('setLngLat').and.callFake(() => marker),
        setPopup: jasmine.createSpy('setPopup').and.callFake(() => marker),
        addTo: jasmine.createSpy('addTo').and.callFake(() => marker),
        remove: jasmine.createSpy('remove'),
    };

    return marker;
}

function createFakePopup(): PopupLike
{
    const popup: PopupLike =
    {
        setHTML: jasmine.createSpy('setHTML').and.callFake(() => popup),
    };

    return popup;
}

function createFakeBounds(): BoundsLike
{
    return {
        extend: jasmine.createSpy('extend'),
    };
}

class MapboxFactoryMock implements MapboxFactory
{
    public readonly mapResult = createFakeMap();
    public readonly bounds = createFakeBounds();

    public readonly createdMarkers: MarkerLike[] = [];
    public readonly createdPopups: PopupLike[] = [];

    createMap(options: mapboxgl.MapOptions): mapboxgl.Map
    {
        void options;
        return this.mapResult.map as unknown as mapboxgl.Map;
    }

    createMarker(options?: mapboxgl.MarkerOptions): mapboxgl.Marker
    {
        void options;
        const marker = createFakeMarker();
        this.createdMarkers.push(marker);

        return marker as unknown as mapboxgl.Marker;
    }

    createPopup(options?: mapboxgl.PopupOptions): mapboxgl.Popup
    {
        void options;
        const popup = createFakePopup();
        this.createdPopups.push(popup);

        return popup as unknown as mapboxgl.Popup;
    }

    createLngLatBounds(): mapboxgl.LngLatBounds
    {
        return this.bounds as unknown as mapboxgl.LngLatBounds;
    }

    createNavigationControl(): mapboxgl.NavigationControl
    {
        return {} as mapboxgl.NavigationControl;
    }
}

describe('MapboxMapComponent', () =>
{
    let component: MapboxMapComponent;
    let fixture: ComponentFixture<MapboxMapComponent>;

    let myCitiesStoreMock: MyCitiesStoreMock;
    let factory: MapboxFactoryMock;

    let host: HTMLDivElement;

    beforeEach(async () =>
    {
        host = document.createElement('div');
        host.id = 'mapboxMap';
        host.style.height = '400px';
        host.style.width = '400px';
        document.body.appendChild(host);

        myCitiesStoreMock = new MyCitiesStoreMock();
        factory = new MapboxFactoryMock();

        spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) =>
        {
            cb(0);
            return 1;
        });

        await TestBed.configureTestingModule(
        {
            imports: [MapboxMapComponent],
            providers:
            [
                { provide: MyCitiesStoreService, useValue: myCitiesStoreMock },
                { provide: MAPBOX_FACTORY, useValue: factory },
            ]
        })
        .compileComponents();

        fixture = TestBed.createComponent(MapboxMapComponent);
        component = fixture.componentInstance;
    });

    afterEach(() =>
    {
        fixture.destroy();
        host.remove();
    });

    it('should create', () =>
    {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('onDecadeChange should update selectedDecade and call store.setDecadeFilter', () =>
    {
        fixture.detectChanges();

        component.onDecadeChange('1990s');

        expect(component.selectedDecade).toBe('1990s');
        expect(myCitiesStoreMock.setDecadeFilter).toHaveBeenCalledWith('1990s');

        component.onDecadeChange(null);

        expect(component.selectedDecade).toBeNull();
        expect(myCitiesStoreMock.setDecadeFilter).toHaveBeenCalledWith('');
    });

    it('onStayChange should update selectedStayDuration and call store.setStayDurationFilter', () =>
    {
        fixture.detectChanges();

        component.onStayChange('3-5 mos');

        expect(component.selectedStayDuration).toBe('3-5 mos');
        expect(myCitiesStoreMock.setStayDurationFilter).toHaveBeenCalledWith('3-5 mos');

        component.onStayChange(null);

        expect(component.selectedStayDuration).toBeNull();
        expect(myCitiesStoreMock.setStayDurationFilter).toHaveBeenCalledWith('');
    });

    it('ngAfterViewInit should call ensureLoaded and create the map once', () =>
    {
        spyOn(myCitiesStoreMock, 'ensureLoaded').and.callThrough();

        fixture.detectChanges();

        // Fire the load event registered by initMapOnce()
        factory.mapResult.handlers.load?.();

        expect(myCitiesStoreMock.ensureLoaded).toHaveBeenCalled();
        expect(factory.mapResult.map.addControl).toHaveBeenCalled();
        expect(factory.mapResult.map.resize).toHaveBeenCalled();
    });

    it('filteredCities$ should render markers for valid coords and fit bounds', () =>
    {
        fixture.detectChanges();

        const cities =
        [
            { city: 'Good1', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto,
            { city: 'BadNull', country: 'X', lat: null, lon: 20 } as unknown as MyCityDto,
            { city: 'BadNaN', country: 'X', lat: 'abc' as unknown as number, lon: 20 } as unknown as MyCityDto,
            { city: 'Good2', country: 'X', lat: 11, lon: 21 } as unknown as MyCityDto,
        ];

        myCitiesStoreMock.emitCities(cities);

        expect(factory.createdMarkers.length).toBe(2);
        expect(factory.createdPopups.length).toBe(2);

        expect((factory.bounds.extend as jasmine.Spy).calls.count()).toBe(2);
        expect(factory.mapResult.map.fitBounds).toHaveBeenCalled();
    });

   it('onBasemapChange should set basemap mode and return early when map is not ready', () =>
    {
        fixture.detectChanges();

        // init likely called these already
        (factory.mapResult.map.setStyle as jasmine.Spy).calls.reset();
        (factory.mapResult.map.once as jasmine.Spy).calls.reset();

        // ensure the component map is not ready
        (component as unknown as { map?: mapboxgl.Map }).map = undefined;

        component.onBasemapChange('navNight');

        expect(myCitiesStoreMock.setBasemapMode).toHaveBeenCalledWith('navNight' as unknown as BasemapMode);
        expect(factory.mapResult.map.setStyle).not.toHaveBeenCalled();
        expect(factory.mapResult.map.once).not.toHaveBeenCalled();
    });


    it('onBasemapChange should call setStyle and re-render after style.load when latestCities exists', () =>
    {
        fixture.detectChanges();

        (component as unknown as { latestCities: MyCityDto[] | null }).latestCities =
        [
            { city: 'Good1', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto,
        ];

        const renderSpy = spyOn(component as unknown as { renderMarkers: (c: MyCityDto[]) => void }, 'renderMarkers');

        component.onBasemapChange('navNight');

        expect(factory.mapResult.map.setStyle).toHaveBeenCalled();
        expect(factory.mapResult.map.once).toHaveBeenCalledWith('style.load', jasmine.any(Function));

        expect(factory.mapResult.handlers.styleLoad).toBeDefined();
        factory.mapResult.handlers.styleLoad?.();

        expect(renderSpy).toHaveBeenCalled();
    });

    it('ngOnDestroy should remove markers and remove the map', () =>
    {
        fixture.detectChanges();

        myCitiesStoreMock.emitCities(
        [
            { city: 'Good1', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto,
            { city: 'Good2', country: 'X', lat: 11, lon: 21 } as unknown as MyCityDto,
        ]
        );

        component.ngOnDestroy();

        for (const marker of factory.createdMarkers)
        {
            expect(marker.remove).toHaveBeenCalled();
        }

        expect(factory.mapResult.map.remove).toHaveBeenCalled();
    });

    it('onBasemapChange should return early when currentStyle matches the requested style', () =>
    {
        fixture.detectChanges();

        // Map init may have already called `once` / `setStyle` during detectChanges().
        factory.mapResult.map.once.calls.reset();
        factory.mapResult.map.setStyle.calls.reset();

        // Arrange: set currentStyle to the exact style that navNight maps to
        interface HasBasemapStyles
        {
            basemapStyles: Record<string, string>;
        }

        interface HasCurrentStyle
        {
            currentStyle: string;
        }

        const basemapStyles = (component as unknown as HasBasemapStyles).basemapStyles;
        const targetStyle = basemapStyles['navNight'];

        (component as unknown as HasCurrentStyle).currentStyle = targetStyle;

        // Act
        component.onBasemapChange('navNight');

        // Assert
        expect(myCitiesStoreMock.setBasemapMode).toHaveBeenCalledWith('navNight' as unknown as BasemapMode);

        // Early return: should NOT setStyle / once
        expect(factory.mapResult.map.setStyle).not.toHaveBeenCalled();
        expect(factory.mapResult.map.once).not.toHaveBeenCalled();
    });


    it('map load handler should render markers if latestCities is already stored', () =>
    {
        fixture.detectChanges();

        // Arrange
        const cities =
        [
            { city: 'Good1', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto,
        ];

        (component as unknown as { latestCities: MyCityDto[] | null }).latestCities = cities;

        const renderSpy = spyOn(component as unknown as { renderMarkers: (c: MyCityDto[]) => void }, 'renderMarkers');

        // Act: simulate map load event
        expect(factory.mapResult.handlers.load).toBeDefined();
        factory.mapResult.handlers.load?.();

        // Assert
        expect(renderSpy).toHaveBeenCalledWith(cities);
    });

    it('filteredCities$ should store latestCities and not render when map is not ready', () =>
    {
        fixture.detectChanges();

        // Arrange: make map not ready AFTER component has initialized
        (component as unknown as { map?: mapboxgl.Map }).map = undefined;

        const renderSpy = spyOn(component as unknown as { renderMarkers: (c: MyCityDto[]) => void }, 'renderMarkers');

        const cities =
        [
            { city: 'Good1', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto,
        ];

        // Act
        myCitiesStoreMock.emitCities(cities);

        // Assert: stored
        expect((component as unknown as { latestCities: MyCityDto[] | null }).latestCities).toEqual(cities);

        // Assert: but NOT rendered
        expect(renderSpy).not.toHaveBeenCalled();
    });

    it('renderMarkers should return early when cities is empty', () =>
    {
        fixture.detectChanges();

        // Act
        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void }).renderMarkers([]);

        // Assert
        expect(factory.createdMarkers.length).toBe(0);
        expect(factory.createdPopups.length).toBe(0);
        expect(factory.mapResult.map.fitBounds).not.toHaveBeenCalled();
    });

    it('renderMarkers should call fitBounds with padding 50 and maxZoom 9', () =>
    {
        fixture.detectChanges();

        const cities =
        [
            { city: 'Good1', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto,
            { city: 'Good2', country: 'X', lat: 11, lon: 21 } as unknown as MyCityDto,
        ];

        myCitiesStoreMock.emitCities(cities);

        expect(factory.mapResult.map.fitBounds).toHaveBeenCalled();

        const args = (factory.mapResult.map.fitBounds as jasmine.Spy).calls.mostRecent().args;
        const options = args[1] as { padding?: number; maxZoom?: number } | undefined;

        expect(options).toBeDefined();
        expect(options?.padding).toBe(50);
        expect(options?.maxZoom).toBe(9);
    });

    it('escapeHtml should escape &, <, >, ", and apostrophe and handle null/undefined', () =>
    {
        fixture.detectChanges();

        const escape = (component as unknown as { escapeHtml: (v: unknown) => string }).escapeHtml;

        expect(escape(null)).toBe('');
        expect(escape(undefined)).toBe('');

        const raw = `a&b<c>d"e'f`;
        const escaped = escape(raw);

        expect(escaped).toBe('a&amp;b&lt;c&gt;d&quot;e&#039;f');
    });

    it('renderMarkers should include Stay/Decades in popup HTML only when values exist', () =>
    {
        fixture.detectChanges();

        const cities =
        [
            { city: 'WithBoth', country: 'X', lat: 10, lon: 20, stayDuration: '3 days', decades: '1990s' } as unknown as MyCityDto,
            { city: 'WithNeither', country: 'X', lat: 11, lon: 21, stayDuration: '', decades: '' } as unknown as MyCityDto,
        ];

        myCitiesStoreMock.emitCities(cities);

        // We created 2 popups; get the HTML that was sent to setHTML across them.
        const htmlCalls = factory.createdPopups
            .map(p => (p.setHTML as jasmine.Spy).calls.mostRecent().args[0] as string);

        // One should contain both optional blocks
        expect(htmlCalls.some(h => h.includes('<b>Stay:</b>') && h.includes('<b>Decades:</b>'))).toBeTrue();

        // One should contain neither optional block
        expect(htmlCalls.some(h => !h.includes('<b>Stay:</b>') && !h.includes('<b>Decades:</b>'))).toBeTrue();
    });

    it('initMapOnce should return early and not create a second map when map already exists', () =>
    {
        fixture.detectChanges();

        // Arrange: init already happened once via detectChanges; createMap should have been called once
        spyOn(factory, 'createMap').and.callThrough();

        // Force a "map already exists" scenario
        (component as unknown as { map?: mapboxgl.Map }).map = factory.mapResult.map as unknown as mapboxgl.Map;

        // Act: call initMapOnce again
        (component as unknown as { initMapOnce: () => void }).initMapOnce();

        // Assert: because map exists, createMap should NOT be called again
        expect(factory.createMap).not.toHaveBeenCalled();
    });

    it('ngAfterViewInit should still init map when ensureLoaded errors', () =>
    {
        // Arrange
        const createMapSpy = spyOn(factory, 'createMap').and.callThrough();

        spyOn(myCitiesStoreMock, 'ensureLoaded').and.returnValue(
            throwError(() => new Error('boom'))
        );

        // Act
        fixture.detectChanges();

        // Fire the load event that initMapOnce registered via once('load', ...)
        factory.mapResult.handlers.load?.();

        // Assert
        expect(myCitiesStoreMock.ensureLoaded).toHaveBeenCalled();
        expect(createMapSpy).toHaveBeenCalled();
        expect(factory.mapResult.map.addControl).toHaveBeenCalled();
        expect(factory.mapResult.map.resize).toHaveBeenCalled();
    });

    it('initMapOnce should use standard style when selectedBasemap is undefined', () =>
    {
        // Arrange: capture the options passed into createMap
        const createMapSpy = spyOn(factory, 'createMap').and.callThrough();

        // Make selectedBasemap undefined
        (component as unknown as { selectedBasemap?: BasemapMode }).selectedBasemap = undefined;

        // Act
        fixture.detectChanges();

        // Assert: createMap got called with options whose style matches basemapStyles.standard
        expect(createMapSpy).toHaveBeenCalled();

        const options = createMapSpy.calls.mostRecent().args[0] as mapboxgl.MapOptions;

        const basemapStyles = (component as unknown as { basemapStyles: Record<string, string> }).basemapStyles;
        expect(options.style).toBe(basemapStyles['standard']);

        const currentStyle = (component as unknown as { currentStyle: string }).currentStyle;
        expect(currentStyle).toBe(basemapStyles['standard']);
    });

    it('createMarkerElement should update opacity on mouseenter and mouseleave', () =>
    {
        fixture.detectChanges();

        const create = (component as unknown as { createMarkerElement: () => HTMLElement }).createMarkerElement;

        const el = create();

        // Initial
        expect(el.style.opacity).toBe('0.72');

        // Hover in
        el.dispatchEvent(new MouseEvent('mouseenter'));
        expect(el.style.opacity).toBe('1');

        // Hover out
        el.dispatchEvent(new MouseEvent('mouseleave'));
        expect(el.style.opacity).toBe('0.72');
    });

    it('renderMarkers should clear markers but NOT fit bounds when cities array is empty', () =>
    {
        fixture.detectChanges();

        // Arrange
        const clearSpy = spyOn(
            component as unknown as { clearMarkers: () => void },
            'clearMarkers'
        ).and.callThrough();

        // Act
        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void })
            .renderMarkers([]);

        // Assert

        // IMPORTANT: clearMarkers SHOULD run
        expect(clearSpy).toHaveBeenCalled();

        // But nothing else should happen
        expect(factory.createdMarkers.length).toBe(0);
        expect(factory.createdPopups.length).toBe(0);

        expect((factory.bounds.extend as jasmine.Spy).calls.count()).toBe(0);
        expect(factory.mapResult.map.fitBounds).not.toHaveBeenCalled();
    });

    it('renderMarkers should return immediately when map is undefined', () =>
    {
        // ❗ NO fixture.detectChanges()

        // Confirm map truly does not exist
        expect((component as unknown as { map?: mapboxgl.Map }).map).toBeUndefined();

        const clearSpy = spyOn(
            component as unknown as { clearMarkers: () => void },
            'clearMarkers'
        );

        // Act
        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void })
            .renderMarkers([
                { city: 'Test', country: 'X', lat: 10, lon: 20 } as unknown as MyCityDto
            ]);

        // Assert

        // Should exit BEFORE clearMarkers()
        expect(clearSpy).not.toHaveBeenCalled();

        expect(factory.createdMarkers.length).toBe(0);
        expect(factory.mapResult.map.fitBounds).not.toHaveBeenCalled();
    });

});

describe('MapboxMapComponent', () =>
{
    let component: MapboxMapComponent;
    let fixture: ComponentFixture<MapboxMapComponent>;
    
    let myCitiesStoreMock: MyCitiesStoreService;

    beforeEach(async () =>
    {
         // Minimal stub: buildPopupHtml doesn't touch it.
        myCitiesStoreMock = {} as unknown as MyCitiesStoreService;

        
        const mapboxFactoryStub = () => ({}) as unknown; // never called in these tests

        await TestBed.configureTestingModule(
        {
            imports: [MapboxMapComponent],
            providers:
            [
                { provide: MyCitiesStoreService, useValue: myCitiesStoreMock },
                { provide: MAPBOX_FACTORY, useValue: mapboxFactoryStub }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(MapboxMapComponent);
        component = fixture.componentInstance;
    });

    describe('buildPopupHtml notes block', () =>
    {
        function getSut(component: unknown): { buildPopupHtml: (city: MyCityDto) => string }
        {
            return component as unknown as { buildPopupHtml: (city: MyCityDto) => string };
        }

        it('includes Notes block when notes has non-whitespace content', () =>
        {
            const city: MyCityDto =
            {
                id: 1,
                city: 'Test City',
                country: 'Test Country',
                region: 'Test Region',
                notes: '  Hello world  ',
                lat: 0,
                lon: 0,
                stayDuration: '',
                decades: ''
            };

            const sut = getSut(component);
            const html = sut.buildPopupHtml(city);

            expect(html).toContain('Notes:');
            expect(html).toContain('Hello world');
        });

        it('omits Notes block when notes is only whitespace (trim => empty)', () =>
        {
            const city: MyCityDto =
            {
                id: 2,
                city: 'Test City',
                country: 'Test Country',
                region: 'Test Region',
                notes: '     ',
                lat: 0,
                lon: 0,
                stayDuration: '',
                decades: ''
            };

            const sut = getSut(component);
            const html = sut.buildPopupHtml(city);

            expect(html).not.toContain('Notes:');
            expect(html).not.toContain('white-space: pre-wrap');
        });
    });

});