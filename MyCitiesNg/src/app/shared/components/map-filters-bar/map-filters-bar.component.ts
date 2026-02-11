import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';

export interface BasemapOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-map-filters-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-filters-bar.component.html',
  styleUrl: './map-filters-bar.component.scss',
})
export class MapFiltersBarComponent 
{
    // Data sources
    @Input({ required: true }) decades$!: Observable<string[]>;
    @Input({ required: true }) stayDurations$!: Observable<string[]>;
    @Input() basemaps: BasemapOption[] = [];

    // Optional selected values (so parent can keep the UI in sync)
    @Input() selectedDecade: string | null = null;
    @Input() selectedStayDuration: string | null = null;
    @Input() selectedBasemap: string | null = null;

    // Outputs
    @Output() decadeChange = new EventEmitter<string | null>();
    @Output() stayDurationChange = new EventEmitter<string | null>();
    @Output() basemapChange = new EventEmitter<string>();

   onDecadeSelectChange(target: EventTarget | null): void 
   {
        const select = target as HTMLSelectElement | null;
        if (!select) 
        {
            return;
        }

        const value = select.value;
        this.decadeChange.emit(value === '' ? null : value);
    }

    onStayDurationSelectChange(target: EventTarget | null): void 
    {
        const select = target as HTMLSelectElement | null;
        if (!select) 
        {
            return;
        }

        const value = select.value;
        this.stayDurationChange.emit(value === '' ? null : value);
    }

    onBasemapSelectChange(target: EventTarget | null): void 
    {
        const select = target as HTMLSelectElement | null;
        if (!select) 
        {
            return;
        }

        const value = select.value;
        this.basemapChange.emit(value);
    }
}