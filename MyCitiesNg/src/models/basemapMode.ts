export type LeafletBasemap = 'standard' | 'humanitarian' | 'opentopo' | 'esristreet' | 'esriworldimagery';
export type MapboxBasemap = 'standard' | 'outdoors' | 'satelliteStreets' | 'navDay' | 'navNight';
export type GoogleBasemap = 'roadmap' | 'terrain' | 'satellite' | 'hybrid';

export interface BasemapSelections
{
    leaflet: LeafletBasemap;
    mapbox: MapboxBasemap;
    google: GoogleBasemap;
}

export const DEFAULT_BASEMAPS: Readonly<BasemapSelections> =
{
    leaflet: 'standard',
    mapbox: 'standard',
    google: 'roadmap'
};

export const BASEMAP_OPTIONS =
{
    leaflet: ['standard', 'humanitarian', 'opentopo', 'esristreet', 'esriworldimagery'],
    mapbox: ['standard', 'outdoors', 'satelliteStreets', 'navDay', 'navNight'],
    google: ['roadmap', 'terrain', 'satellite', 'hybrid']
} as const;

export function isBasemapForEngine<E extends keyof BasemapSelections>(engine: E, value: string): value is BasemapSelections[E]
{
    return (BASEMAP_OPTIONS[engine] as readonly string[]).includes(value);
}

export type BasemapMode = LeafletBasemap;
