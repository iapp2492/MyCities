import { AfterViewInit, Component, inject, DestroyRef, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import { MyCityDto } from '../../../models/myCityDto';
import { CommonModule } from '@angular/common';
import type { BasemapMode } from '../../../models/basemapMode';
import { MapFiltersBarComponent, BasemapOption } from '../../shared/components/map-filters-bar/map-filters-bar.component';


@Component({
    selector: 'app-leaflet-map',
    standalone: true,
    imports: [CommonModule, MapFiltersBarComponent],
    templateUrl: './leaflet-map.component.html',
    styleUrl: './leaflet-map.component.scss',
})
export class LeafletMapComponent implements AfterViewInit, OnDestroy 
{
    private map?: L.Map;
    private markerLayer = L.layerGroup();
    private destroyRef = inject(DestroyRef);
    private citiesStore = inject(MyCitiesStoreService);
    private tileLayer?: L.TileLayer;

    private readonly MARKER_OPACITY = 0.70;
    private readonly TOOLTIP_MIN_ZOOM = 6;   // <-- tweak this
    private markersWithTooltips: L.Marker[] = [];

    stayDurations$ = this.citiesStore.stayDurations$;
    decades$ = this.citiesStore.decades$;

    basemaps: BasemapOption[] =
        [
            { value: 'standard', label: 'Standard' },
            { value: 'humanitarian', label: 'OSM Humanitarian' },
            { value: 'opentopo', label: 'OpenTopoMap' },
            { value: 'esristreet', label: 'Esri World Street' },
            { value: 'esriworldimagery', label: 'Esri World Imagery' },
            { value: 'wikimedia', label: 'Wikimedia' },
        ];

    selectedDecade: string | null = null;
    selectedStayDuration: string | null = null;
    selectedBasemap: string | null = 'standard';

    onDecadeChange(value: string | null): void 
    {   
        this.selectedDecade = value;
        this.citiesStore.setDecadeFilter(value ?? '');
    }

    onStayChange(value: string | null): void 
    {
        this.selectedStayDuration = value;
        this.citiesStore.setStayDurationFilter(value ?? '');
    }

    // Unlike the other two filters, there will always be a valid basemap (never null) 
    onBasemapChange(value: string): void 
    {
        this.selectedBasemap = value;
        this.citiesStore.setBasemapMode(value as BasemapMode);
    }

    // Helper to escape HTML in city names for safe popup content
    private escapeHtml(value: unknown): string 
    {
        const s = String(value ?? '');
        return s
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    ngAfterViewInit(): void 
    {
        // Fix default marker icons in Angular builds
        delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;

        L.Icon.Default.mergeOptions(
            {
                iconRetinaUrl: '/assets/leaflet/marker-icon-2x.png',
                iconUrl: '/assets/leaflet/marker-icon.png',
                shadowUrl: '/assets/leaflet/marker-shadow.png',
            });

        if (this.map)
        {
            return;
        }

        // Create map
        this.map = L.map('map',
            {
                center: [18.465299, -66.116666],   // Centered on San Juan, Puerto Rico
                zoom: 5
            });

        this.map.on('zoomend', () => this.updateTooltipVisibility());

        this.applyBasemap('standard'); // default to light mode

        this.markerLayer.addTo(this.map);
        this.wireData();
    }

    private renderMarkers(cities: MyCityDto[]): void 
    {
        if (!this.map) 
        {
            return;
        }

        this.markerLayer.clearLayers();
        this.markersWithTooltips = [];

        if (cities.length === 0) 
        {
            return;
        }

        const bounds = L.latLngBounds([]);

        for (const city of cities) 
        { 
            let skipped = 0;
            const lat = Number(city.lat);
            const lon = Number(city.lon);

            // Skip bad coordinates BEFORE doing anything else
            if (!Number.isFinite(lat) || !Number.isFinite(lon))
            {
                console.warn('Skipping city with invalid coordinates:', city);
                skipped++;
                continue;
            }
            
            if (skipped > 0)
            {
                console.warn(`Skipped ${skipped} cities due to invalid coordinates`);
            }

            const popupHtml = `
            <div style="min-width: 240px">
                <div style="font-weight: 600; font-size: 1.05rem; margin-bottom: 6px;">
                ${this.escapeHtml(city.city)}
                </div>
                <div><b>Country:</b> ${this.escapeHtml(city.country)}</div>
                <div><b>Stay duration:</b> ${this.escapeHtml((city as MyCityDto).stayDuration ?? '')}</div>
                <div><b>Decades:</b> ${this.escapeHtml((city as MyCityDto).decades ?? '')}</div>
                ${(city as MyCityDto).notes
                    ? `<div style="margin-top: 6px;"><b>Notes:</b><br/>${this.escapeHtml((city as MyCityDto).notes)}</div>`
                    : ''
                }
            </div>
            `;

            const marker = L.marker(
                [lat, lon],
                {
                    opacity: this.MARKER_OPACITY
                }
            );

            this.markersWithTooltips.push(marker);

            marker.on('mouseover', () => marker.setOpacity(1));
            marker.on('mouseout', () => marker.setOpacity(this.MARKER_OPACITY));

            marker
                .bindTooltip(this.escapeHtml(city.city), {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -8],
                    opacity: 0.95,
                    className: 'city-tooltip'
                })
                .bindPopup(popupHtml);

            marker.addTo(this.markerLayer);

            bounds.extend(marker.getLatLng());
        }

        this.map.fitBounds(bounds, { padding: [50, 50] });
        this.updateTooltipVisibility();
    }

    // Load and cache our cities data, and redraw on any filter changes
    private wireData(): void 
    {
        // Ensure load kicks off (and cached thereafter)
        this.citiesStore.ensureLoaded()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ error: err => console.error('Failed to load cities', err) });

        // Reactively redraw whenever filters change
        this.citiesStore.filteredCities$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                {
                    next: cities => 
                    {
                        if (!this.map) 
                        {
                            return;
                        }
                        this.renderMarkers(cities);
                    }
                });

        this.citiesStore.basemapMode$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(mode => this.applyBasemap(mode));

    }

    private applyBasemap(mode: 'standard' | 'humanitarian' | 'opentopo' | 'esristreet' | 'esriworldimagery' | 'wikimedia'): void 
    {
        if (!this.map) 
        {
            return;
        }

        // Remove the previous tile layer (if any)
        if (this.tileLayer) 
        {
            this.tileLayer.removeFrom(this.map);
        }

        if (mode === 'humanitarian') 
        {
            this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
                {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors, HOT'
                });
        }
        else if (mode === 'opentopo') 
        {
            this.tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                {
                    maxZoom: 17,
                    attribution: '&copy; OpenStreetMap contributors, OpenTopoMap'
                });
        }
        else if (mode === 'esristreet') 
        {
            this.tileLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 19,
                    attribution: 'Tiles &copy; Esri'
                });
        }
        else if (mode === 'esriworldimagery') 
        {
            this.tileLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    maxZoom: 19,
                    attribution: 'Tiles &copy; Esri'
                });
        }
        else if (mode === 'wikimedia') 
        {
            this.tileLayer = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
                {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors, Wikimedia'
                });
        }
        else 
        {
            // OpenStreetMap standard
            this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                });
        }

        this.tileLayer.addTo(this.map);
    }

    private updateTooltipVisibility(): void 
        {
        if (!this.map) 
        {
            return;
        }

        const show = this.map.getZoom() >= this.TOOLTIP_MIN_ZOOM;
        for (const m of this.markersWithTooltips) 
            {
            if (show) 
            {
                m.openTooltip();
            }
            else 
            {
                m.closeTooltip();
            }
        };

    };

    ngOnDestroy(): void 
    {
        // Stop future work (extra defensive; takeUntilDestroyed already handles streams)
        this.markerLayer?.clearLayers();
        this.markersWithTooltips.length = 0;

        if (this.map)
        {
            // Detach all handlers + release the container
            this.map.off();
            this.map.remove();
            this.map = undefined;
        }
    }

}