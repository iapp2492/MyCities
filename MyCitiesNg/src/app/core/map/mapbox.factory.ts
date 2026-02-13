import { InjectionToken } from '@angular/core';
import mapboxgl from 'mapbox-gl';

export interface MapboxFactory
{
    createMap(options: mapboxgl.MapOptions): mapboxgl.Map;

    createMarker(options?: mapboxgl.MarkerOptions): mapboxgl.Marker;

    createPopup(options?: mapboxgl.PopupOptions): mapboxgl.Popup;

    createLngLatBounds(): mapboxgl.LngLatBounds;

    createNavigationControl(): mapboxgl.NavigationControl;
}

export const MAPBOX_FACTORY = new InjectionToken<MapboxFactory>('MAPBOX_FACTORY');

export const MAPBOX_FACTORY_IMPL: MapboxFactory =
{
    createMap(options)
    {
        return new mapboxgl.Map(options);
    },

    createMarker(options)
    {
        return new mapboxgl.Marker(options);
    },

    createPopup(options)
    {
        return new mapboxgl.Popup(options);
    },

    createLngLatBounds()
    {
        return new mapboxgl.LngLatBounds();
    },

    createNavigationControl()
    {
        return new mapboxgl.NavigationControl();
    }
};
