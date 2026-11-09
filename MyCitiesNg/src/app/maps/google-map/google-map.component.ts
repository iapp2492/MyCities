import { AfterViewInit, Component, DestroyRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import { MyCityDto } from '../../../models/myCityDto';
import { MapFiltersBarComponent, BasemapOption } from '../../shared/components/map-filters-bar/map-filters-bar.component';
import { GoogleBasemap, isBasemapForEngine } from '../../../models/basemapMode';
import { environment } from '../../../environments/environment';
import { MapHintService } from '../../core/services/map-hint.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CityPopupHtmlService } from '../../core/services/city-popup-html.service';
import { PhotoViewerLauncherService } from '../../photo-viewer/photo-viewer-launcher.service';
import { CommonModule } from '@angular/common';
import { DebugLoggerService } from '../../core/services/debug-logger.service';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
    selector: 'app-google-map',
    standalone: true,
    imports: [CommonModule, MapFiltersBarComponent],
    templateUrl: './google-map.component.html',
    styleUrl: './google-map.component.scss',
})
export class GoogleMapComponent implements AfterViewInit, OnDestroy
{
    private readonly citiesStore = inject(MyCitiesStoreService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly mapsLoader = inject(GoogleMapsLoaderService);
    private readonly mapHintService = inject(MapHintService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly popupHtml = inject(CityPopupHtmlService);
    private readonly photoViewerLauncher = inject(PhotoViewerLauncherService);
    private readonly debugLogger = inject(DebugLoggerService);
    private readonly FIT_BOUNDS_MAX_ZOOM = 6;
    private readonly analytics = inject(AnalyticsService);

    private map?: google.maps.Map;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private infoWindow?: google.maps.InfoWindow;
    private currentPopupCity: MyCityDto | null = null;

    private latestCities: MyCityDto[] | null = null;

    decades$ = this.citiesStore.decades$;
    locations$ = this.citiesStore.locations$;
    stayDurations$ = this.citiesStore.stayDurations$;

    basemaps: BasemapOption[] =
        [
            { value: 'roadmap', label: 'Roadmap' },
            { value: 'terrain', label: 'Terrain' },
            { value: 'satellite', label: 'Satellite' },
            { value: 'hybrid', label: 'Hybrid' }
        ];

    get selectedBasemap(): GoogleBasemap
    {
        return this.citiesStore.getBasemapMode('google');
    }
    readonly selectedDecade$ = this.citiesStore.decadeFilter$;
    readonly selectedLocation$ = this.citiesStore.locationFilter$;
    readonly selectedStayDuration$ = this.citiesStore.stayDurationFilter$;

    onDecadeChange(value: string | null): void
    {
        this.citiesStore.setDecadeFilter(value);
    }

    onLocationChange(value: string | null): void
    {
        this.citiesStore.setLocationFilter(value);
    }

    onStayChange(value: string | null): void
    {
        this.citiesStore.setStayDurationFilter(value);
    }

    // Basemap selection always has a valid engine-specific value.
    onBasemapChange(value: string): void
    {
        if (!isBasemapForEngine('google', value))
        {
            return;
        }

        this.citiesStore.setBasemapMode('google', value);

        if (!this.map)
        {
            return;
        }
        this.map.setMapTypeId(value as google.maps.MapTypeId);
    }

    ngAfterViewInit(): void
    {
        // 1) Ensure data is loaded (cached after first call anywhere)
        this.citiesStore.ensureLoaded()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: async () =>
                {
                    await this.initMapOnce();
                },
                error: async () =>
                {
                    await this.initMapOnce();
                } // still init; you'll just have no markers
            });

        // 2) Render markers based on filteredCities$ (filters affect map automatically)
        this.citiesStore.filteredCities$
            .pipe(
                this.debugLogger.debugTap<MyCityDto[] | null>('filteredCities$ emitted:'),
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

    private async initMapOnce(): Promise<void>
    {
        const mapEl = document.getElementById('googleMap') as HTMLElement | null;

        if (!mapEl || !mapEl.isConnected || this.map)
        {
            return;
        }

        const { Map } = await this.mapsLoader.importLibrary('maps') as google.maps.MapsLibrary;

        if (this.destroyRef.destroyed)
        {
            return;
        }

        await this.mapsLoader.importLibrary('marker');

        // Navigation may have destroyed the view while the libraries were loading.
        if (this.destroyRef.destroyed || !mapEl.isConnected || this.map)
        {
            return;
        }

        this.map = new Map(mapEl,
            {
                center: { lat: 20, lng: 0 },
                zoom: 2,
                mapTypeId: this.selectedBasemap as google.maps.MapTypeId,
                mapId: environment.googleMapsMapId,
            });

        this.infoWindow = new google.maps.InfoWindow();

        this.infoWindow.addListener('domready', () =>
        {
            this.attachPopupHandlers();
        });

        google.maps.event.addListenerOnce(this.map, 'idle', () =>
        {
            this.showMapHintOnce();
        });

        if (this.latestCities && this.latestCities.length > 0)
        {
            this.renderMarkers(this.latestCities);
        }
    }

    private attachPopupHandlers(): void
    {
        const infoWindowContainer = document.querySelector('.gm-style-iw') as HTMLElement | null;

        if (!infoWindowContainer)
        {
            return;
        }

        const photoLink = infoWindowContainer.querySelector('.js-view-photos') as HTMLAnchorElement | null;

        if (!photoLink)
        {
            return;
        }

        photoLink.addEventListener('click', (event: Event) =>
        {
            event.preventDefault();
            event.stopPropagation();

            const photoKey = Number(photoLink.getAttribute('data-photo-key'));

            if (!Number.isFinite(photoKey) || photoKey <= 0)
            {
                return;
            }

            this.openPhotoViewer(photoKey);
        });
    }

    private openPhotoViewer(photoKey: number): void
    {
        this.debugLogger.log(`Opening photo dialog for photoKey: ${photoKey}`);

        // Analytics: log that photos for the specified city were viewed
        this.analytics.event('photo_view_opened',
            {
                city: this.currentPopupCity?.city,
                country: this.currentPopupCity?.country,
                photoKey: photoKey,
                engine: 'google'
            });

        this.photoViewerLauncher.open(photoKey, 'google');
    }

    private renderMarkers(cities: MyCityDto[]): void
    {
        this.debugLogger.log('Rendering markers for cities in the renderMarkers method:', cities);
        if (!this.map)
        {
            return;
        }

        this.clearMarkers();
        if (cities.length === 0)
        {
            return;
        }

        const bounds = new google.maps.LatLngBounds();

        for (const city of cities)
        {
            if (city.lon == null || city.lat == null)
            {
                continue;
            }

            const content = this.createMarkerElement();

            const marker = new google.maps.marker.AdvancedMarkerElement(
                {
                    map: this.map,
                    position: { lat: city.lat, lng: city.lon },
                    content,
                });

            marker.addListener('click', () =>
            {
                const hasPhotos = this.citiesStore.hasPhotos(city.photoKey);
                const html = this.popupHtml.build(city, hasPhotos);
                this.currentPopupCity = city;
                this.infoWindow?.setContent(html);
                this.infoWindow?.open({ map: this.map!, anchor: marker });

                // Analytics: log which city was clicked
                this.analytics.event('city_popup_opened',
                    {
                        city: city.city,
                        country: city.country,
                        photoKey: city.photoKey,
                        engine: 'google'
                    });
            });

            this.debugLogger.log(`Placing marker for ${city.city} at (${city.lat}, ${city.lon})`);

            this.markers.push(marker);
            bounds.extend({ lat: city.lat, lng: city.lon });
        }

        this.map.fitBounds(bounds, 50); // 50px padding
        // Google maps doesn't expose maxZoom in fitBounds, so we must wait for 'idle' before correcting it
        google.maps.event.addListenerOnce(this.map, 'idle', () =>
        {
            if (!this.map)
            {
                return;
            }

            const currentZoom = this.map.getZoom();
            if (currentZoom != null && currentZoom > this.FIT_BOUNDS_MAX_ZOOM)
            {
                this.map.setZoom(this.FIT_BOUNDS_MAX_ZOOM);
            }
        });
    }

    private clearMarkers(): void
    {
        for (const m of this.markers)
        {
            m.map = null;
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

    private showMapHintOnce(): void
    {
        this.mapHintService.showOnceIfNeeded('google',
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
    }

    ngOnDestroy(): void
    {
        this.clearMarkers();
        this.map = undefined;
    }
}
