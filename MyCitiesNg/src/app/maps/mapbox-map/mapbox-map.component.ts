import { AfterViewInit, Component, DestroyRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';
import mapboxgl from 'mapbox-gl';
import '../../core/config/mapbox-init'; 
import { MyCitiesStoreService} from '../../core/services/my-cities-store.service';
import { MyCityDto } from '../../../models/myCityDto'; 
import { MapFiltersBarComponent, BasemapOption } from '../../shared/components/map-filters-bar/map-filters-bar.component';
import type { BasemapMode } from '../../../models/basemapMode';

@Component({
  selector: 'app-mapbox-map',
  standalone: true,
  imports: [MapFiltersBarComponent],
  templateUrl: './mapbox-map.component.html',
  styleUrl: './mapbox-map.component.scss',
})
export class MapboxMapComponent implements AfterViewInit, OnDestroy 
{
    private readonly citiesStore = inject(MyCitiesStoreService);
    private readonly destroyRef = inject(DestroyRef);

    private map?: mapboxgl.Map;
    private markers: mapboxgl.Marker[] = [];
    private latestCities: MyCityDto[] | null = null;

    private readonly basemapStyles: Record<string, string> =
    {
        standard: 'mapbox://styles/mapbox/standard',
        streets: 'mapbox://styles/mapbox/streets-v12',
        outdoors: 'mapbox://styles/mapbox/outdoors-v12',
        light: 'mapbox://styles/mapbox/light-v11',
        dark: 'mapbox://styles/mapbox/dark-v11',
        satellite: 'mapbox://styles/mapbox/satellite-v9',
        satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
        navDay: 'mapbox://styles/mapbox/navigation-day-v1',
        navNight: 'mapbox://styles/mapbox/navigation-night-v1'
    };
    private currentStyle?: string;
    
    stayDurations$ = this.citiesStore.stayDurations$;
    decades$ = this.citiesStore.decades$;

    basemaps: BasemapOption[] =
    [
        { value: 'standard', label: 'Standard' },
        { value: 'outdoors', label: 'Outdoors' },
        { value: 'satelliteStreets', label: 'Satellite Streets' },
        { value: 'navDay', label: 'Navigation Day' },
        { value: 'navNight', label: 'Navigation Night' }
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

        if (!this.map) 
        {
            return;
        }

        // Prevent unnecessary reload
        const styleUrl = this.basemapStyles[value];

        if (this.currentStyle === styleUrl) 
        {
            return;
        }

        this.currentStyle = styleUrl;
        this.map.setStyle(styleUrl);

        // After style loads, re-fit markers
        this.map.once('style.load', () =>
        {
            if (this.latestCities)
            {
                this.renderMarkers(this.latestCities);
            }
        });
    }

    ngAfterViewInit(): void 
    {
        // 1) Ensure data is loaded (cached after first call anywhere)
        this.citiesStore.ensureLoaded()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
        {
            next: () => this.initMapOnce(),
            error: () => this.initMapOnce() // still init; you'll just have no markers
        });


        // 2) Render markers based on filteredCities$ (filters affect map automatically)
        this.citiesStore.filteredCities$
        .pipe(
            tap((cities: MyCityDto[] | null) => console.log('filteredCities$ emitted:', cities)),
            takeUntilDestroyed(this.destroyRef),
            filter((cities): cities is MyCityDto[] => Array.isArray(cities))
        )
        .subscribe(cities => 
        {
            this.latestCities = cities; // store latest for use if map isn’t ready yet
            if (!this.map) 
            {
                return;
            }
            this.renderMarkers(cities);
        });
    }

    ngOnDestroy(): void 
    {
        this.clearMarkers();
        this.map?.remove();
    }

    private initMapOnce(): void 
    {
        if (this.map) 
        {
            return;
        }   

        this.map = new mapboxgl.Map(
        {
            container: 'mapboxMap',
            style: this.basemapStyles[this.selectedBasemap ?? 'standard'],
            center: [0, 20],  // [lng, lat]
            zoom: 1.6
        });

        this.currentStyle = this.basemapStyles[this.selectedBasemap ?? 'standard'];

        requestAnimationFrame(() => this.map?.resize());

        // Optional nice controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // When the map is ready, do an initial render if data already exists
        this.map.on('load', () => 
        {
            if (this.latestCities) 
            {
                this.renderMarkers(this.latestCities);
            }
        });

        // Initial render occurs either here (if data already exists)
        // or via the filteredCities subscription in ngAfterViewInit.

    }

    private renderMarkers(cities: MyCityDto[]): void 
    {
        if (!this.map) 
        {
            return;
        }

        this.clearMarkers();

        if (cities.length === 0) 
        {
            return;
        }

        const bounds = new mapboxgl.LngLatBounds();

        for (const city of cities) 
        {
            // Guard against bad data
            if (city.lon == null || city.lat == null) 
            {
                continue;
            }

            const lat = Number(city.lat);
            const lon = Number(city.lon);

            // Skip bad coordinates BEFORE doing anything else
            if (!Number.isFinite(lat) || !Number.isFinite(lon))
            {
                console.warn('Skipping city with invalid coordinates:', city);
                continue;
            }

            const el = this.createMarkerElement();

            const popupHtml = `
                <div style="font-size: 13px; line-height: 1.25;">
                <div style="font-weight: 700; margin-bottom: 6px;">${this.escapeHtml(city.city)}</div>
                <div><b>Country:</b> ${this.escapeHtml(city.country)}</div>
                ${city.stayDuration ? `<div><b>Stay:</b> ${this.escapeHtml(city.stayDuration)}</div>` : ''}
                ${city.decades ? `<div><b>Decades:</b> ${this.escapeHtml(city.decades)}</div>` : ''}
                </div>
            `;

            const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(popupHtml);

            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([city.lon, city.lat])
                .setPopup(popup)
                .addTo(this.map);

            this.markers.push(marker);
            bounds.extend([city.lon, city.lat]);
        }

        // Fit all visible markers
        this.map.fitBounds(bounds, 
        {
            padding: 50,
            maxZoom: 9
        });
    }

    private clearMarkers(): void 
    {
        for (const m of this.markers) 
        {
            m.remove();
        }
        this.markers = [];
    }

    private createMarkerElement(): HTMLElement 
    {
        const el = document.createElement('div');
        el.className = 'mycity-marker';

        // Simple “burgundy dot” with opacity + hover
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '50%';
        el.style.background = '#7a1f3d';
        el.style.opacity = '0.72';
        el.style.border = '2px solid rgba(255,255,255,0.9)';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';

        el.addEventListener('mouseenter', () => el.style.opacity = '1');
        el.addEventListener('mouseleave', () => el.style.opacity = '0.72');

        return el;
    }

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

}