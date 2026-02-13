import mapboxgl from 'mapbox-gl';
import { MAPBOX_FACTORY, MAPBOX_FACTORY_IMPL } from './mapbox.factory';

describe('MAPBOX_FACTORY + MAPBOX_FACTORY_IMPL', () =>
{
    it('should define the MAPBOX_FACTORY injection token', () =>
    {
        expect(MAPBOX_FACTORY).toBeTruthy();

        // InjectionToken exposes the description via toString()
        // Example: "InjectionToken MAPBOX_FACTORY"
        const tokenAsString = MAPBOX_FACTORY.toString();
        expect(tokenAsString).toContain('MAPBOX_FACTORY');
    });

    it('createMap should call new mapboxgl.Map(options) and return the instance', () =>
    {
        const fakeMap = {} as unknown as mapboxgl.Map;

        const mapCtorSpy = spyOn(mapboxgl as unknown as { Map: new (o: mapboxgl.MapOptions) => mapboxgl.Map }, 'Map')
            .and.returnValue(fakeMap);

        const options = {} as mapboxgl.MapOptions;

        const result = MAPBOX_FACTORY_IMPL.createMap(options);

        expect(mapCtorSpy).toHaveBeenCalledOnceWith(options);
        expect(result).toBe(fakeMap);
    });

    it('createMarker should call new mapboxgl.Marker(options) and return the instance', () =>
    {
        const fakeMarker = {} as unknown as mapboxgl.Marker;

        const markerCtorSpy = spyOn(mapboxgl as unknown as { Marker: new (o?: mapboxgl.MarkerOptions) => mapboxgl.Marker }, 'Marker')
            .and.returnValue(fakeMarker);

        const options = {} as mapboxgl.MarkerOptions;

        const result = MAPBOX_FACTORY_IMPL.createMarker(options);

        expect(markerCtorSpy).toHaveBeenCalledOnceWith(options);
        expect(result).toBe(fakeMarker);
    });

    it('createMarker should call new mapboxgl.Marker() when no options are provided', () =>
    {
        const fakeMarker = {} as unknown as mapboxgl.Marker;

        const markerCtorSpy = spyOn(mapboxgl as unknown as { Marker: new (o?: mapboxgl.MarkerOptions) => mapboxgl.Marker }, 'Marker')
            .and.returnValue(fakeMarker);

        const result = MAPBOX_FACTORY_IMPL.createMarker();

        expect(markerCtorSpy).toHaveBeenCalledOnceWith(undefined);
        expect(result).toBe(fakeMarker);
    });

    it('createPopup should call new mapboxgl.Popup(options) and return the instance', () =>
    {
        const fakePopup = {} as unknown as mapboxgl.Popup;

        const popupCtorSpy = spyOn(mapboxgl as unknown as { Popup: new (o?: mapboxgl.PopupOptions) => mapboxgl.Popup }, 'Popup')
            .and.returnValue(fakePopup);

        const options = {} as mapboxgl.PopupOptions;

        const result = MAPBOX_FACTORY_IMPL.createPopup(options);

        expect(popupCtorSpy).toHaveBeenCalledOnceWith(options);
        expect(result).toBe(fakePopup);
    });

    it('createLngLatBounds should call new mapboxgl.LngLatBounds() and return the instance', () =>
    {
        const fakeBounds = {} as unknown as mapboxgl.LngLatBounds;

        const boundsCtorSpy = spyOn(mapboxgl as unknown as { LngLatBounds: new () => mapboxgl.LngLatBounds }, 'LngLatBounds')
            .and.returnValue(fakeBounds);

        const result = MAPBOX_FACTORY_IMPL.createLngLatBounds();

        expect(boundsCtorSpy).toHaveBeenCalledTimes(1);
        expect(result).toBe(fakeBounds);
    });

    it('createNavigationControl should call new mapboxgl.NavigationControl() and return the instance', () =>
    {
        const fakeControl = {} as unknown as mapboxgl.NavigationControl;

        const navCtorSpy = spyOn(mapboxgl as unknown as { NavigationControl: new () => mapboxgl.NavigationControl }, 'NavigationControl')
            .and.returnValue(fakeControl);

        const result = MAPBOX_FACTORY_IMPL.createNavigationControl();

        expect(navCtorSpy).toHaveBeenCalledTimes(1);
        expect(result).toBe(fakeControl);
    });
});
