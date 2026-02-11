import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { LeafletMapComponent } from './leaflet-map.component';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import type { MyCityDto } from '../../../models/myCityDto';
import type { BasemapMode } from '../../../models/basemapMode';

import * as L from 'leaflet';

type ZoomHandler = (zoom?: number) => void;

interface LeafletMapLike
{
    on(event: 'zoomend', handler: ZoomHandler): void;
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
    return {
        on: jasmine.createSpy('on'),
        getZoom: jasmine.createSpy('getZoom').and.returnValue(5),
        fitBounds: jasmine.createSpy('fitBounds') as jasmine.Spy<(b: LeafletBoundsLike) => void>,
        remove: jasmine.createSpy('remove'),
    };
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
    let store: MyCitiesStoreMock;

    let fakeMap: LeafletMapLike;
    let fakeLayerGroup: LeafletLayerGroupLike;
    let fakeTileLayer: LeafletTileLayerLike;

    beforeEach(async () =>
    {
        document.body.innerHTML = `<div id="map" style="height: 400px; width: 400px;"></div>`;

        store = new MyCitiesStoreMock();

        fakeMap = createFakeMap();
        fakeLayerGroup = createFakeLayerGroup();
        fakeTileLayer = createFakeTileLayer();

        spyOn(L, 'map').and.returnValue(fakeMap as unknown as L.Map);
        spyOn(L, 'layerGroup').and.returnValue(fakeLayerGroup as unknown as L.LayerGroup);
        spyOn(L, 'tileLayer').and.returnValue(fakeTileLayer as unknown as L.TileLayer);
        spyOn(L, 'marker').and.callFake(() => createFakeMarker() as unknown as L.Marker);
        spyOn(L, 'latLngBounds').and.returnValue(createFakeBounds() as unknown as L.LatLngBounds);

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
            providers: [{ provide: MyCitiesStoreService, useValue: store }],
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
        expect(store.setDecadeFilter).toHaveBeenCalledWith('1990s');

        component.onDecadeChange(null);

        expect(component.selectedDecade).toBeNull();
        expect(store.setDecadeFilter).toHaveBeenCalledWith('');
    });

    it('onStayChange should update selectedStayDuration and call store.setStayDurationFilter', () =>
    {
        component.onStayChange('3-5 mos');

        expect(component.selectedStayDuration).toBe('3-5 mos');
        expect(store.setStayDurationFilter).toHaveBeenCalledWith('3-5 mos');

        component.onStayChange(null);

        expect(component.selectedStayDuration).toBeNull();
        expect(store.setStayDurationFilter).toHaveBeenCalledWith('');
    });

    it('onBasemapChange should update selectedBasemap and call store.setBasemapMode', () =>
    {
        component.onBasemapChange('esristreet');

        expect(component.selectedBasemap).toBe('esristreet');
        expect(store.setBasemapMode).toHaveBeenCalledWith('esristreet');
    });

    it('ngAfterViewInit should create the map, register zoom handler, add layers, and wire data', () =>
    {
        spyOn(store, 'ensureLoaded').and.callThrough();

        fixture.detectChanges();

        expect(L.map).toHaveBeenCalled();
        expect((fakeMap.on as jasmine.Spy)).toHaveBeenCalledWith('zoomend', jasmine.any(Function));

        expect(L.tileLayer).toHaveBeenCalled();
        expect((fakeTileLayer.addTo as jasmine.Spy)).toHaveBeenCalledWith(fakeMap);

        expect((fakeLayerGroup.addTo as jasmine.Spy)).toHaveBeenCalledWith(fakeMap);

        expect(store.ensureLoaded).toHaveBeenCalled();
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

        store.emitCities(cities);

        expect((fakeLayerGroup.clearLayers as jasmine.Spy)).toHaveBeenCalled();
        expect(L.marker).toHaveBeenCalled();
        expect((fakeMap.fitBounds as jasmine.Spy)).toHaveBeenCalled();
    });

    it('should apply basemap when basemapMode$ emits', () =>
    {
        fixture.detectChanges();

        store.emitBasemap('voyager' as BasemapMode);

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

    it('ngOnDestroy should remove the map', () =>
    {
        (component as unknown as { map: LeafletMapLike }).map = fakeMap;

        component.ngOnDestroy();

        expect((fakeMap.remove as jasmine.Spy)).toHaveBeenCalled();
    });
});
