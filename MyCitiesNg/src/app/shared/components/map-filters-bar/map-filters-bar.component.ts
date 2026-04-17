import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Observable } from 'rxjs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LocationFilterOption } from '../../../../models/LocationFilterOption';
import { AnalyticsService } from '../../../core/services/analytics.service';

export interface BasemapOption {
  value: string;
  label: string;
}

type MapEngine = 'leaflet' | 'mapbox' | 'google';

@Component({
  selector: 'app-map-filters-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonToggleModule],
  templateUrl: './map-filters-bar.component.html',
  styleUrl: './map-filters-bar.component.scss',
})
export class MapFiltersBarComponent 
{
    // Data sources
    @Input({ required: true }) decades$!: Observable<string[]>;
    @Input({ required: true }) locations$!: Observable<LocationFilterOption[]>;
    @Input({ required: true }) stayDurations$!: Observable<string[]>;
    @Input() basemaps: BasemapOption[] = [];

    // Optional selected values (so parent can keep the UI in sync)
    @Input() selectedDecade: string | null = null;
    @Input() selectedStayDuration: string | null = null;
    @Input() selectedBasemap: string | null = null;
    @Input() selectedLocation: string | null = null;

    // Outputs
    @Output() decadeChange = new EventEmitter<string | null>();
    @Output() stayDurationChange = new EventEmitter<string | null>();
    @Output() basemapChange = new EventEmitter<string>();
    @Output() locationChange = new EventEmitter<string | null>();

    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    public currentEngine: MapEngine = 'leaflet';
    private readonly analytics = inject(AnalyticsService);

    public constructor()
    {
        // Keep segmented control in sync with the current URL (/map/:engine)
        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() =>
            {
                const engineFromUrl = this.getEngineFromUrl(this.router.url);
                this.currentEngine = engineFromUrl;
            });

        // Initialize immediately (first render)
        this.currentEngine = this.getEngineFromUrl(this.router.url);
    } 
    
    onBasemapSelectChange(target: EventTarget | null): void 
    {
        const select = target as HTMLSelectElement | null;
        if (!select) 
        {
            return;
        }

        const value = select.value;

        this.analytics.event('basemap_changed',
        {
            engine: this.currentEngine,
            basemap: value
        });

        this.basemapChange.emit(value);
    }


    private getEngineFromUrl(url: string): MapEngine
    {
        // Example: /map/google?decade=1990s
        const match = url.match(/\/map\/(leaflet|mapbox|google)(?:\?|$)/i);
        const engine = (match?.[1]?.toLowerCase() ?? 'leaflet') as MapEngine;
        return engine;
    }

    public onEngineChange(engine: MapEngine): void
    {
        // Update immediately for snappier UI, then navigate.
        this.currentEngine = engine;

        this.analytics.event('map_engine_selected',
        {
            engine: engine
        });

        this.router.navigate(['/map', engine], { queryParamsHandling: 'merge' });
    }

}