import { AfterViewInit, Component, DestroyRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, tap } from 'rxjs';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MyCitiesStoreService} from '../../core/services/my-cities-store.service';
import { MyCityDto } from '../../../models/myCityDto'; 
import { MapFiltersBarComponent, BasemapOption } from '../../shared/components/map-filters-bar/map-filters-bar.component';
import type { BasemapMode } from '../../../models/basemapMode';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-google-map',
  standalone: true,
  imports: [MapFiltersBarComponent],
  templateUrl: './google-map.component.html',
  styleUrl: './google-map.component.scss',
})
export class GoogleMapComponent  implements AfterViewInit, OnDestroy 
{

    private readonly citiesStore = inject(MyCitiesStoreService);
    private readonly destroyRef = inject(DestroyRef);

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

    selectedDecade: string | null = null;
    selectedStayDuration: string | null = null;
    selectedBasemap: string | null = 'roadmap';

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

    private async initMapOnce(): Promise<void> 
    {
        const mapEl = document.getElementById('googleMap') as HTMLElement | null;
        if (!mapEl || this.map) 
{
return;
}

       setOptions(
        {
            key: environment.googleMapsApiKey,
            v: 'weekly',
        });

        const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
        await importLibrary('marker');

        this.map = new Map(mapEl, 
        {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            mapTypeId: (this.selectedBasemap ?? 'roadmap') as google.maps.MapTypeId,
            mapId: environment.googleMapsMapId,
        });

        this.infoWindow = new google.maps.InfoWindow();
        
        if (this.latestCities && this.latestCities.length > 0) 
        {
            this.renderMarkers(this.latestCities);
        }
    }
    
    private renderMarkers(cities: MyCityDto[]): void 
    {
        console.log('Rendering markers for cities in the renderMarkers method:', cities);
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
            const html = this.buildPopupHtml(city);
            this.infoWindow?.setContent(html);
            this.infoWindow?.open({ map: this.map!, anchor: marker });
            });

            console.log(`Placing marker for ${city.city} at (${city.lat}, ${city.lon})`);

            this.markers.push(marker);
                bounds.extend({ lat: city.lat, lng: city.lon });
        }

        this.map.fitBounds(bounds, 50); // 50px padding
    }
    private buildPopupHtml(city: MyCityDto): string 
    {
        return `
            <div style="font-size: 13px; line-height: 1.25;">
            <div style="font-weight: 700; margin-bottom: 6px;">${this.escapeHtml(city.city)}</div>
            <div><b>Country:</b> ${this.escapeHtml(city.country)}</div>
            ${city.stayDuration ? `<div><b>Stay:</b> ${this.escapeHtml(city.stayDuration)}</div>` : ''}
            ${city.decades ? `<div><b>Decades:</b> ${this.escapeHtml(city.decades)}</div>` : ''}
            </div>
        `;
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

    ngOnDestroy(): void 
{
        this.clearMarkers();
        this.map  = undefined;
    }
}