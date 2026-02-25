import { AfterViewInit, Component, DestroyRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';
import '../../core/config/mapbox-init'; 
import { MyCitiesStoreService} from '../../core/services/my-cities-store.service';
import { MyCityDto } from '../../../models/myCityDto'; 
import { MapFiltersBarComponent, BasemapOption } from '../../shared/components/map-filters-bar/map-filters-bar.component';
import type { BasemapMode } from '../../../models/basemapMode';
import { MAPBOX_FACTORY } from '../../core/map/mapbox.factory';
import { MapHintService } from '../../core/services/map-hint.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CityPopupHtmlService } from '../../core/services/city-popup-html.service';

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
    private readonly mapbox = inject(MAPBOX_FACTORY);
    private readonly mapHintService = inject(MapHintService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly popupHtml = inject(CityPopupHtmlService);

    private map?: mapboxgl.Map;
    private markers: mapboxgl.Marker[] = [];
    private latestCities: MyCityDto[] | null = null;

    private readonly basemapStyles: Record<string, string> =
    {
        standard: 'mapbox://styles/mapbox/standard',
        outdoors: 'mapbox://styles/mapbox/outdoors-v12',
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

    ngAfterViewInit(): void 
    {
        // 1) Ensure data is loaded (cached after first call anywhere)
        this.citiesStore.ensureLoaded()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
        {
            next: () => this.initMapOnce(),
            error: () => this.initMapOnce() // still init; we just have no markers
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

        const map = this.map;

        map.setStyle(styleUrl);

        // After style loads, re-fit markers
        map.once('style.load', () =>
        {
            // First, ensure layout is correct
            map.resize();

            // Optional microtask resize (helps on some mobile layouts)
            setTimeout(() => map.resize(), 0);

            // Then re-render the markers
            if (this.latestCities)
            {
                this.renderMarkers(this.latestCities);
            }
        });
    }

    private initMapOnce(): void 
    {
        if (this.map) 
        {
            return;
        } 

        this.map =  this.mapbox.createMap(
        {
            container: 'mapboxMap',
            style: this.basemapStyles[this.selectedBasemap ?? 'standard'],
            center: [0, 20],  // [lng, lat]
            zoom: 1.6
        });

        this.currentStyle = this.basemapStyles[this.selectedBasemap ?? 'standard'];

        if (!this.map)
        {
            return;
        }

        const map = this.map;

        const runAfterLoad = (): void =>
        {
            map.resize();
            setTimeout(() => map.resize(), 0);

            this.mapHintService.showOnceIfNeeded('mapbox',
            {
                showHint: (message: string): void =>
                {
                    this.snackBar.open(message, 'Got it',
                    {
                        duration: 8000,
                        horizontalPosition: 'center',
                        verticalPosition: 'top',
                        panelClass: ['mycities-toast']
                    });
                }
            });

            if (this.latestCities)
            {
                this.renderMarkers(this.latestCities);
            }
        };

        if (map.loaded())
        {
            runAfterLoad();
        }
        else
        {
            map.once('load', runAfterLoad);
        }

        // Optional nice controls
        map.addControl(this.mapbox.createNavigationControl(), 'top-right');

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

        const bounds =  this.mapbox.createLngLatBounds();

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

            const popupHtml = this.popupHtml.build(city);

            const popup = this.mapbox.createPopup(
            {
                offset: [0, 18]
            })
            .setHTML(popupHtml);            

           const marker = this.mapbox.createMarker(
            {
                element: el,
                anchor: 'bottom'
            })
            .setLngLat([lon, lat])
            .setPopup(popup)
            .addTo(this.map);

            this.markers.push(marker);
            bounds.extend([lon, lat]);
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
        // Outer element = hit target (finger-friendly)
        const el = document.createElement('div');
        el.className = 'mycity-marker-hit';

        // Recommended minimum touch target is ~44px
        el.style.width = '44px';
        el.style.height = '44px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.opacity = '0.72';

        // Optional: helps on mobile so taps aren’t delayed / interpreted oddly
        el.style.touchAction = 'manipulation';

        // Inner element = visual dot (same look you already have)
        const dot = document.createElement('div');
        dot.className = 'mycity-marker-dot';

        // Simple “burgundy dot” with opacity + hover      
        dot.style.width = '14px';
        dot.style.height = '14px';
        dot.style.borderRadius = '50%';
        dot.style.background = '#7a1f3d';
        dot.style.border = '2px solid rgba(255,255,255,0.9)';
        dot.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';

        el.appendChild(dot);

        el.addEventListener('mouseenter', () => el.style.opacity = '1');
        el.addEventListener('mouseleave', () => el.style.opacity = '0.72');

        return el;
    }
    
    ngOnDestroy(): void 
    {
        this.clearMarkers();
        this.map?.remove();
    }

}