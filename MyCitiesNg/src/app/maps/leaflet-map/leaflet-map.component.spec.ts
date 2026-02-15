import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { LeafletMapComponent } from './leaflet-map.component';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import type { MyCityDto } from '../../../models/myCityDto';
import type { BasemapMode } from '../../../models/basemapMode';

import * as L from 'leaflet';

type ZoomHandler = (zoom?: number) => void;

interface LeafletMapLike
{
    on(event: 'zoomend', handler: ZoomHandler): void;
    off(event: 'zoomend', handler: ZoomHandler): void;

    getZoom(): number;
    fitBounds(bounds: unknown, options?: unknown): void;
    remove(): void;
}

interface LeafletLayerGroupLike
{
    addTo(map: LeafletMapLike): void;
    clearLayers(): void;
}

interface LeafletTileLayerLike
{
    addTo(map: LeafletMapLike): void;
    removeFrom(map: LeafletMapLike): void;
}

interface LatLngLike
{
    lat: number;
    lng: number;
};

interface LeafletMarkerLike
{
    on(event: string, handler: () => void): void;
    setOpacity(value: number): void;
    bindTooltip(content: string, options: unknown): LeafletMarkerLike;
    bindPopup(content: string): LeafletMarkerLike;
    addTo(layer: LeafletLayerGroupLike): void;
    getLatLng(): LatLngLike;
    openTooltip(): void;
    closeTooltip(): void;
}

interface LeafletBoundsLike
{
    extend(latlng: LatLngLike): void;
}

class MyCitiesStoreMock
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

function createFakeMap(): LeafletMapLike
{
    const onSpy = jasmine.createSpy('on');
    const offSpy = jasmine.createSpy('off');
    const getZoomSpy = jasmine.createSpy('getZoom').and.returnValue(10);
    const fitBoundsSpy = jasmine.createSpy('fitBounds');
    const removeSpy = jasmine.createSpy('remove');

    const map: LeafletMapLike =
    {
        on: onSpy,
        off: offSpy,
        getZoom: getZoomSpy,
        fitBounds: fitBoundsSpy,
        remove: removeSpy,
    };

    return map;
}

function createFakeLayerGroup(): LeafletLayerGroupLike
{
    return {
        addTo: jasmine.createSpy('addTo'),
        clearLayers: jasmine.createSpy('clearLayers'),
    };
}

function createFakeTileLayer(): LeafletTileLayerLike
{
    return {
        addTo: jasmine.createSpy('addTo'),
        removeFrom: jasmine.createSpy('removeFrom'),
    };
}

function createFakeMarker(): LeafletMarkerLike
{
    const marker: LeafletMarkerLike =
    {
        on: jasmine.createSpy('on'),
        setOpacity: jasmine.createSpy('setOpacity'),
        bindTooltip: jasmine.createSpy('bindTooltip').and.callFake(() => marker),
        bindPopup: jasmine.createSpy('bindPopup').and.callFake(() => marker),
        addTo: jasmine.createSpy('addTo'),
        getLatLng: jasmine.createSpy('getLatLng').and.returnValue({ lat: 1, lng: 2 }),
        openTooltip: jasmine.createSpy('openTooltip'),
        closeTooltip: jasmine.createSpy('closeTooltip'),
    };

    return marker;
}

function createFakeBounds(): LeafletBoundsLike
{
    return {
        extend: jasmine.createSpy('extend'),
    };
}

describe('LeafletMapComponent', () =>
{
    let component: LeafletMapComponent;
    let fixture: ComponentFixture<LeafletMapComponent>;
    let myCitiesStoreMock: MyCitiesStoreMock;

    let fakeMap: LeafletMapLike;
    let fakeLayerGroup: LeafletLayerGroupLike;
    let fakeTileLayer: LeafletTileLayerLike;
    let host: HTMLDivElement;
    let tileLayerSpy: jasmine.Spy;

    beforeEach(async () =>
    {
        host = document.createElement('div');
        host.id = 'map';
        host.style.height = '400px';
        host.style.width = '400px';
        document.body.appendChild(host);

        myCitiesStoreMock = new MyCitiesStoreMock();

        fakeMap = createFakeMap();
        fakeLayerGroup = createFakeLayerGroup();
        fakeTileLayer = createFakeTileLayer();

        spyOn(L, 'map').and.returnValue(fakeMap as unknown as L.Map);
        spyOn(L, 'layerGroup').and.returnValue(fakeLayerGroup as unknown as L.LayerGroup);
        spyOn(L, 'marker').and.callFake(() => createFakeMarker() as unknown as L.Marker);
        spyOn(L, 'latLngBounds').and.returnValue(createFakeBounds() as unknown as L.LatLngBounds);
        tileLayerSpy = spyOn(L, 'tileLayer').and.returnValue(fakeTileLayer as unknown as L.TileLayer);


        // Make Icon.Default + mergeOptions exist in unit test environment without empty funcs
        const leafletAsRecord = L as unknown as Record<string, unknown>;

        if (!leafletAsRecord['Icon'])
        {
            leafletAsRecord['Icon'] = {};
        }

        const iconRecord = leafletAsRecord['Icon'] as Record<string, unknown>;

        if (!iconRecord['Default'])
        {
            iconRecord['Default'] = function LeafletDefaultIcon(): void 
            { /* intentionally blank */ };
        }

        const defaultRecord = iconRecord['Default'] as unknown as Record<string, unknown>;
        const proto = (defaultRecord['prototype'] as Record<string, unknown>) ?? {};
        defaultRecord['prototype'] = proto;

        if (!defaultRecord['mergeOptions'])
        {
            defaultRecord['mergeOptions'] = jasmine.createSpy('mergeOptions');
        }

        await TestBed.configureTestingModule(
        {
            imports: [LeafletMapComponent],
            providers: [{ provide: MyCitiesStoreService, useValue: myCitiesStoreMock }],
        })
        .compileComponents();

        fixture = TestBed.createComponent(LeafletMapComponent);
        component = fixture.componentInstance;

        // Ensure the instance uses our layer group (the field initializer may run before the spy)
        (component as unknown as { markerLayer: LeafletLayerGroupLike }).markerLayer = fakeLayerGroup;
    });

    it('should create', () =>
    {
        expect(component).toBeTruthy();
    });

    it('onDecadeChange should update selectedDecade and call store.setDecadeFilter', () =>
    {
        component.onDecadeChange('1990s');

        expect(component.selectedDecade).toBe('1990s');
        expect(myCitiesStoreMock.setDecadeFilter).toHaveBeenCalledWith('1990s');

        component.onDecadeChange(null);

        expect(component.selectedDecade).toBeNull();
        expect(myCitiesStoreMock.setDecadeFilter).toHaveBeenCalledWith('');
    });

    it('onStayChange should update selectedStayDuration and call store.setStayDurationFilter', () =>
    {
        component.onStayChange('3-5 mos');

        expect(component.selectedStayDuration).toBe('3-5 mos');
        expect(myCitiesStoreMock.setStayDurationFilter).toHaveBeenCalledWith('3-5 mos');

        component.onStayChange(null);

        expect(component.selectedStayDuration).toBeNull();
        expect(myCitiesStoreMock.setStayDurationFilter).toHaveBeenCalledWith('');
    });

    it('onBasemapChange should update selectedBasemap and call store.setBasemapMode', () =>
    {
        component.onBasemapChange('esristreet');

        expect(component.selectedBasemap).toBe('esristreet');
        expect(myCitiesStoreMock.setBasemapMode).toHaveBeenCalledWith('esristreet');
    });

    it('ngAfterViewInit should create the map, register zoom handler, add layers, and wire data', () =>
    {
        spyOn(myCitiesStoreMock, 'ensureLoaded').and.callThrough();

        fixture.detectChanges();

        expect(L.map).toHaveBeenCalled();
        expect((fakeMap.on as jasmine.Spy)).toHaveBeenCalledWith('zoomend', jasmine.any(Function));

        expect(L.tileLayer).toHaveBeenCalled();
        expect((fakeTileLayer.addTo as jasmine.Spy)).toHaveBeenCalledWith(fakeMap);

        expect((fakeLayerGroup.addTo as jasmine.Spy)).toHaveBeenCalledWith(fakeMap);

        expect(myCitiesStoreMock.ensureLoaded).toHaveBeenCalled();
    });

    afterEach(() =>
    {
        fixture?.destroy();
        host?.remove();
    });

    it('should render markers when filteredCities$ emits', () =>
    {
        fixture.detectChanges();

        const cities =
        [
            {
                city: 'Test City',
                country: 'Testland',
                lat: 10,
                lon: 20,
                stayDuration: '3-5 mos',
                decades: '2000s',
                notes: `<b>note</b>`,
            } as unknown as MyCityDto,
        ];

        myCitiesStoreMock.emitCities(cities);

        expect((fakeLayerGroup.clearLayers as jasmine.Spy)).toHaveBeenCalled();
        expect(L.marker).toHaveBeenCalled();
        expect((fakeMap.fitBounds as jasmine.Spy)).toHaveBeenCalled();
    });

    it('should apply basemap when basemapMode$ emits', () =>
    {
        fixture.detectChanges();

        myCitiesStoreMock.emitBasemap('voyager' as BasemapMode);

        expect(L.tileLayer).toHaveBeenCalled();
        expect((fakeTileLayer.addTo as jasmine.Spy)).toHaveBeenCalledWith(fakeMap);
    });

    it('updateTooltipVisibility should open tooltips when zoom >= TOOLTIP_MIN_ZOOM', () =>
    {
        fixture.detectChanges();

        const m1 = createFakeMarker();
        const m2 = createFakeMarker();

        (component as unknown as { markersWithTooltips: LeafletMarkerLike[] }).markersWithTooltips = [m1, m2];
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (fakeMap.getZoom as jasmine.Spy).and.returnValue(6);

        (component as unknown as { updateTooltipVisibility: () => void }).updateTooltipVisibility();

        expect((m1.openTooltip as jasmine.Spy)).toHaveBeenCalled();
        expect((m2.openTooltip as jasmine.Spy)).toHaveBeenCalled();
        expect((m1.closeTooltip as jasmine.Spy)).not.toHaveBeenCalled();
    });

    it('updateTooltipVisibility should close tooltips when zoom < TOOLTIP_MIN_ZOOM', () =>
    {
        fixture.detectChanges();

        const m1 = createFakeMarker();
        const m2 = createFakeMarker();

        (component as unknown as { markersWithTooltips: LeafletMarkerLike[] }).markersWithTooltips = [m1, m2];
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (fakeMap.getZoom as jasmine.Spy).and.returnValue(5);

        (component as unknown as { updateTooltipVisibility: () => void }).updateTooltipVisibility();

        expect((m1.closeTooltip as jasmine.Spy)).toHaveBeenCalled();
        expect((m2.closeTooltip as jasmine.Spy)).toHaveBeenCalled();
        expect((m1.openTooltip as jasmine.Spy)).not.toHaveBeenCalled();
    });

   it('ngOnDestroy should empty markersWithTooltips', () =>
    {
        const map = createFakeMap();

        (component as unknown as {
            map: LeafletMapLike;
            markersWithTooltips: LeafletMarkerLike[];
        }).map = map;

        (component as unknown as {
            markersWithTooltips: LeafletMarkerLike[];
        }).markersWithTooltips = [createFakeMarker(), createFakeMarker()];

        component.ngOnDestroy();

        expect(
            (component as unknown as {
                markersWithTooltips: LeafletMarkerLike[];
            }).markersWithTooltips.length
        ).toBe(0);
    });

    it('ngOnDestroy should remove the map', () =>
    {
        const map = createFakeMap();
        (component as unknown as { map: LeafletMapLike }).map = map;

        component.ngOnDestroy();

        expect(map.off).toHaveBeenCalled();
        expect(map.remove).toHaveBeenCalled();
        expect(fakeLayerGroup.clearLayers).toHaveBeenCalled();
    });

    it('ngAfterViewInit should return early when map already exists', () =>
    {
        // Arrange: pretend the map is already created
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        // Act
        component.ngAfterViewInit();

        // Assert: should NOT attempt to create another map or re-wire everything
        expect(L.map).not.toHaveBeenCalled();
        expect(fakeMap.on).not.toHaveBeenCalledWith('zoomend', jasmine.any(Function));
    });

    it('wireData should NOT render markers when filteredCities$ emits before map is ready', () =>
    {
        // IMPORTANT: do NOT call fixture.detectChanges(); (that would create the map)

        // Subscribe to store streams (same as ngAfterViewInit would do)
        (component as unknown as { wireData: () => void }).wireData();

        const cities =
        [
            {
                city: 'NoMapYet',
                country: 'Testland',
                lat: 10,
                lon: 20,
            } as unknown as MyCityDto,
        ];

        myCitiesStoreMock.emitCities(cities);

        // Because map is not set, the subscription should return early
        expect(L.marker).not.toHaveBeenCalled();
        expect(fakeLayerGroup.clearLayers).not.toHaveBeenCalled();
        expect(fakeMap.fitBounds).not.toHaveBeenCalled();
    });

    it('applyBasemap should return early when map is not initialized', () =>
    {
        // Arrange
        (component as unknown as { map: LeafletMapLike | null }).map = null;

        // Act
        (component as unknown as { applyBasemap: (m: BasemapMode) => void }).applyBasemap('standard' as BasemapMode);

        // Assert
        expect(L.tileLayer).not.toHaveBeenCalled();
        expect(fakeTileLayer.addTo).not.toHaveBeenCalled();
    });

    it('updateTooltipVisibility should return early when map is not initialized', () =>
    {
        const m1 = createFakeMarker();
        const m2 = createFakeMarker();

        (component as unknown as { markersWithTooltips: LeafletMarkerLike[] }).markersWithTooltips = [m1, m2];
        (component as unknown as { map: LeafletMapLike | null }).map = null;

        (component as unknown as { updateTooltipVisibility: () => void }).updateTooltipVisibility();

        expect(m1.openTooltip).not.toHaveBeenCalled();
        expect(m1.closeTooltip).not.toHaveBeenCalled();
        expect(m2.openTooltip).not.toHaveBeenCalled();
        expect(m2.closeTooltip).not.toHaveBeenCalled();
    });

    it('renderMarkers should skip invalid coordinates and wire mouseover/mouseout opacity handlers', () =>
    {
        // Arrange
        const bounds = createFakeBounds();
        (L.latLngBounds as jasmine.Spy).and.returnValue(bounds as unknown as L.LatLngBounds);

        const marker = createFakeMarker();
        (L.marker as jasmine.Spy).and.returnValue(marker as unknown as L.Marker);

        spyOn(console, 'warn');

        (component as unknown as { map: LeafletMapLike }).map = fakeMap;
        (component as unknown as { markerLayer: LeafletLayerGroupLike }).markerLayer = fakeLayerGroup;

        const cities =
        [
            {
                city: 'BadLat',
                country: 'X',
                lat: 'NOT_A_NUMBER' as unknown as number,
                lon: 20,
            } as unknown as MyCityDto,
            {
                city: 'GoodCity',
                country: 'Y',
                lat: 10,
                lon: 20,
            } as unknown as MyCityDto,
        ];

        // Act
        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void }).renderMarkers(cities);

        // Assert: invalid coords were detected
        expect(console.warn).toHaveBeenCalled();
        expect((console.warn as jasmine.Spy).calls.allArgs().some(a =>
            String(a[0]).includes('Skipping') && String(a[0]).includes('invalid coordinates')
        )).toBeTrue();

        // Only the valid city should extend bounds (once)
        expect(bounds.extend).toHaveBeenCalledTimes(1);

        // Marker was created for the valid city and added to the layer
        expect(L.marker).toHaveBeenCalled();
        expect(marker.addTo).toHaveBeenCalledWith(fakeLayerGroup);

        // Verify mouseover/mouseout handlers were registered...
        const onCalls = (marker.on as jasmine.Spy).calls.allArgs();
        const mouseoverCall = onCalls.find(c => c[0] === 'mouseover');
        const mouseoutCall = onCalls.find(c => c[0] === 'mouseout');

        expect(mouseoverCall).toBeTruthy();
        expect(mouseoutCall).toBeTruthy();

        // ...and that invoking them changes opacity as expected
        const mouseoverHandler = mouseoverCall![1] as () => void;
        const mouseoutHandler = mouseoutCall![1] as () => void;

        (marker.setOpacity as jasmine.Spy).calls.reset();

        mouseoverHandler();
        expect(marker.setOpacity).toHaveBeenCalledWith(1);

        (marker.setOpacity as jasmine.Spy).calls.reset();

        mouseoutHandler();
        expect(marker.setOpacity).toHaveBeenCalled();
    });

    it('escapeHtml should escape &, <, >, ", and apostrophe', () =>
    {
        const input = `Tom & Jerry <tag> "q" 'a'`;

        const result = (component as unknown as { escapeHtml: (v: unknown) => string }).escapeHtml(input);

        expect(result).toContain('&amp;');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).toContain('&quot;');
        expect(result).toContain('&#039;');
    });

    it('ngAfterViewInit should invoke the zoomend handler and call updateTooltipVisibility', () =>
    {
        const updateSpy = spyOn(
            component as unknown as { updateTooltipVisibility: () => void },
            'updateTooltipVisibility'
        ).and.callThrough();

        fixture.detectChanges();

        const args = (fakeMap.on as jasmine.Spy).calls.allArgs();
        const zoomCall = args.find(a => a[0] === 'zoomend');

        expect(zoomCall).toBeTruthy();

        const handler = zoomCall![1] as () => void;

        handler();

        expect(updateSpy).toHaveBeenCalled();
    });

    it('renderMarkers should return early when map is not set', () =>
    {
        (component as unknown as { map: LeafletMapLike | null }).map = null;

        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void }).renderMarkers(
            [{ city: 'X' } as unknown as MyCityDto]
        );

        expect(fakeLayerGroup.clearLayers).not.toHaveBeenCalled();
        expect(L.marker).not.toHaveBeenCalled();
    });

    it('renderMarkers should return early when cities is empty (after clearing layers)', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void }).renderMarkers([]);

        expect(fakeLayerGroup.clearLayers).toHaveBeenCalled();
        expect(L.marker).not.toHaveBeenCalled();
        expect(fakeMap.fitBounds).not.toHaveBeenCalled();
    });

    it('renderMarkers should warn once at the end when skipped > 0', () =>
    {
        const warnSpy = spyOn(console, 'warn');

        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        const cities =
        [
            { city: 'Bad', country: 'X', lat: 'NaN' as unknown as number, lon: 20 } as unknown as MyCityDto,
            { city: 'Good', country: 'Y', lat: 10, lon: 20 } as unknown as MyCityDto,
        ];

        (component as unknown as { renderMarkers: (c: MyCityDto[]) => void }).renderMarkers(cities);

        // 1) city-level warning + 2) summary warning
        expect(warnSpy.calls.count()).toBeGreaterThanOrEqual(1);

        const lastArgs = warnSpy.calls.mostRecent().args;
        expect(String(lastArgs[0])).toContain('Skipped');

        // Optional: verify the count is included (if your message includes the number)
        expect(String(lastArgs[0])).toContain('1');
    });

    it('wireData should log an error when ensureLoaded errors', () =>
    {
        spyOn(console, 'error');

        spyOn(myCitiesStoreMock, 'ensureLoaded').and.returnValue(
            throwError(() => new Error('boom'))
        );

        (component as unknown as { wireData: () => void }).wireData();

        expect(console.error).toHaveBeenCalled();

        const args = (console.error as jasmine.Spy).calls.mostRecent().args;
        expect(String(args[0])).toContain('Failed to load cities');
    });

    it('applyBasemap should remove prior tile layer and create humanitarian tiles', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (component as unknown as { tileLayer: LeafletTileLayerLike }).tileLayer = fakeTileLayer;

        (component as unknown as { applyBasemap: (m: BasemapMode) => void }).applyBasemap('humanitarian' as BasemapMode);

        expect(fakeTileLayer.removeFrom).toHaveBeenCalledWith(fakeMap);

        const url = tileLayerSpy.calls.mostRecent().args[0] as string;
        expect(url).toContain('tile.openstreetmap.fr');
    });

    it('applyBasemap should create opentopo tiles', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (component as unknown as { applyBasemap: (m: BasemapMode) => void }).applyBasemap('opentopo' as BasemapMode);

        const url = tileLayerSpy.calls.mostRecent().args[0] as string;
        expect(url).toContain('tile.opentopomap.org');
    });

    it('applyBasemap should create esristreet tiles', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (component as unknown as { applyBasemap: (m: BasemapMode) => void }).applyBasemap('esristreet' as BasemapMode);

        const url = tileLayerSpy.calls.mostRecent().args[0] as string;
        expect(url).toContain('World_Street_Map');
    });

    it('applyBasemap should create esriworldimagery tiles', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (component as unknown as { applyBasemap: (m: BasemapMode) => void }).applyBasemap('esriworldimagery' as BasemapMode);

        const url = tileLayerSpy.calls.mostRecent().args[0] as string;
        expect(url).toContain('World_Imagery');
    });

    it('applyBasemap should create wikimedia tiles', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        (component as unknown as { applyBasemap: (m: BasemapMode) => void }).applyBasemap('wikimedia' as BasemapMode);

        const url = tileLayerSpy.calls.mostRecent().args[0] as string;
        expect(url).toContain('maps.wikimedia.org');
    });

    it('renderMarkers returns early when map is not initialized (covers if (!this.map))', () =>
    {
        // Force map to be "not ready"
        (component as unknown as Record<string, unknown>)['map'] = null;

        const cities: MyCityDto[] =
        [
            createCity({ id: 1, city: 'X', country: 'Y', lat: 1, lon: 2 })
        ];

        // Should not throw, and should not attempt to create markers
        expect(() =>
        {
            (component as unknown as { renderMarkers: (c: MyCityDto[]) => void }).renderMarkers(cities);
        }).not.toThrow();

        expect(L.marker).not.toHaveBeenCalled();
    });

    function createCity(overrides: Partial<MyCityDto> & { city: string }): MyCityDto
    {
        return {
            id: overrides.id ?? 0,
            city: overrides.city,
            country: overrides.country ?? '',
            region: overrides.region ?? '',
            notes: overrides.notes ?? '',
            lat: overrides.lat ?? 0,
            lon: overrides.lon ?? 0,
            stayDuration: overrides.stayDuration ?? '',
            decades: overrides.decades ?? '',
        };
    }

    it('escapeHtml treats null/undefined as empty string (covers ?? "" branch)', () =>
    {
        const record = component as unknown as Record<string, unknown>;

        const escapeHtml =
            record['escapeHtml'] as (value: unknown) => string;

        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

});