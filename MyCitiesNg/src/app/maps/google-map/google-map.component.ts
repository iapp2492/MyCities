import { AfterViewInit, Component, DestroyRef, inject, isDevMode, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';
import { GoogleMapsLoaderService } from '../../core/services/google-maps-loader.service';
import { MyCitiesStoreService} from '../../core/services/my-cities-store.service';
import { MyCityDto } from '../../../models/myCityDto'; 
import { MapFiltersBarComponent, BasemapOption } from '../../shared/components/map-filters-bar/map-filters-bar.component';
import type { BasemapMode } from '../../../models/basemapMode';
import { environment } from '../../../environments/environment';
import { MapHintService } from '../../core/services/map-hint.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CityPopupHtmlService } from '../../core/services/city-popup-html.service';
import { MatDialog } from '@angular/material/dialog';
import { PhotoViewerDialogComponent } from '../../photo-viewer/photo-viewer-dialog.component';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-google-map',
  standalone: true,
  imports: [CommonModule, MapFiltersBarComponent],
  templateUrl: './google-map.component.html',
  styleUrl: './google-map.component.scss',
})
export class GoogleMapComponent  implements AfterViewInit, OnDestroy 
{
    private readonly citiesStore = inject(MyCitiesStoreService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly mapsLoader = inject(GoogleMapsLoaderService);
    private readonly mapHintService = inject(MapHintService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly popupHtml = inject(CityPopupHtmlService);
    private readonly dialog = inject(MatDialog);

    private map?: google.maps.Map;
    private markers: google.maps.marker.AdvancedMarkerElement[] = [];
    private infoWindow?: google.maps.InfoWindow;

    private latestCities: MyCityDto[] | null = null;
    
    stayDurations$ = this.citiesStore.stayDurations$;
    decades$ = this.citiesStore.decades$;

    basemaps: BasemapOption[] =
    [
        { value: 'roadmap', label: 'Roadmap' },
        { value: 'terrain', label: 'Terrain' },
        { value: 'satellite', label: 'Satellite' },
        { value: 'hybrid', label: 'Hybrid' }
    ];

    selectedBasemap: string | null = 'roadmap';
    readonly selectedStayDuration$ = this.citiesStore.stayDurationFilter$;
    readonly selectedDecade$ = this.citiesStore.decadeFilter$;

    onDecadeChange(value: string | null): void 
    {
        this.citiesStore.setDecadeFilter(value);
    }

    onStayChange(value: string | null): void 
    {
        this.citiesStore.setStayDurationFilter(value);
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
            this.debugLog<MyCityDto[] | null>('filteredCities$ emitted:'),
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
    
    private debugLog<T>(label: string)
    {
        return tap<T>(value =>
        {
            if (isDevMode())
            {
                console.log(label, value);
            }
        });
    }

    private async initMapOnce(): Promise<void> 
    {
        const mapEl = document.getElementById('googleMap') as HTMLElement | null;

        if (!mapEl || !mapEl.isConnected || this.map)
        {
            return;
        }

        this.mapsLoader.setOptions({ key: environment.googleMapsApiKey, v: 'weekly' });

        const { Map } = await this.mapsLoader.importLibrary('maps') as google.maps.MapsLibrary;
        await this.mapsLoader.importLibrary('marker');

        this.map = new Map(mapEl, 
        {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            mapTypeId: (this.selectedBasemap ?? 'roadmap') as google.maps.MapTypeId,
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

            const photoKey = photoLink.getAttribute('data-photo-key');

            if (!photoKey)
            {
                return;
            }

            this.openPhotoViewer(photoKey);
        });
    }
    
    private openPhotoViewer(photoKey: string): void
    {
        if (isDevMode())
        {
            console.log(`Opening photo dialog for photoKey: ${photoKey}`);
        }

        this.dialog.open(PhotoViewerDialogComponent,
        {
            data:
            {
                photoKey
            },
            maxWidth: '95vw',
            width: '1200px',
            height: '90vh',
            panelClass: 'photo-viewer-dialog'
        });
    }
        
    private renderMarkers(cities: MyCityDto[]): void 
    {
        // Available for debugging: console.log('Rendering markers for cities in the renderMarkers method:', cities);
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

            marker.addEventListener('gmp-click', () => 
            {
                const hasPhotos = this.citiesStore.hasPhotos(city.photoKey);
                const html = this.popupHtml.build(city, hasPhotos);
                this.infoWindow?.setContent(html);
                this.infoWindow?.open({ map: this.map!, anchor: marker });
            });

            // Available for debugging: console.log(`Placing marker for ${city.city} at (${city.lat}, ${city.lon})`);

            this.markers.push(marker);
                bounds.extend({ lat: city.lat, lng: city.lon });
        }

        this.map.fitBounds(bounds, 50); // 50px padding
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
        this.map  = undefined;
    }
}