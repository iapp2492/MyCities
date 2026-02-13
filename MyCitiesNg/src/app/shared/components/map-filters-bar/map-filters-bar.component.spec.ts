import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MapFiltersBarComponent, BasemapOption } from './map-filters-bar.component';

describe('MapFiltersBarComponent', () => 
{
    let component: MapFiltersBarComponent;
    let fixture: ComponentFixture<MapFiltersBarComponent>;

    beforeEach(async () => 
    {
        await TestBed.configureTestingModule(
            {
                imports: [MapFiltersBarComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(MapFiltersBarComponent);
        component = fixture.componentInstance;

        component.decades$ = of(['1990s', '2000s']);
        component.stayDurations$ = of(['1 mo', '3-5 mos']);
        component.basemaps =
            [
                { value: 'roadmap', label: 'Roadmap' },
                { value: 'satellite', label: 'Satellite' },
            ] satisfies BasemapOption[];

        component.selectedDecade = null;
        component.selectedStayDuration = null;
        component.selectedBasemap = 'roadmap';

        fixture.detectChanges();
    });

    it('should create', () => 
{
        expect(component).toBeTruthy();
    });

    it('emits decadeChange with null when Decades dropdown is cleared', () => 
{
        const emitSpy = spyOn(component.decadeChange, 'emit');

        const select = createSelect('');
        component.onDecadeSelectChange(select);

        expect(emitSpy).toHaveBeenCalledOnceWith(null);
    });

    it('emits decadeChange with selected value when Decades dropdown changes', () => 
    {
        const emitSpy = spyOn(component.decadeChange, 'emit');

        const select = createSelect('1990s');
        component.onDecadeSelectChange(select);

        expect(emitSpy).toHaveBeenCalledOnceWith('1990s');
    });

    it('emits stayDurationChange with null when Stay Durations dropdown is cleared', () => 
    {
        const emitSpy = spyOn(component.stayDurationChange, 'emit');

        const select = createSelect('');
        component.onStayDurationSelectChange(select);

        expect(emitSpy).toHaveBeenCalledOnceWith(null);
    });

    it('emits stayDurationChange with selected value when Stay Durations dropdown changes', () => 
{
        const emitSpy = spyOn(component.stayDurationChange, 'emit');

        const select = createSelect('3-5 mos');
        component.onStayDurationSelectChange(select);

        expect(emitSpy).toHaveBeenCalledOnceWith('3-5 mos');
    });

    it('emits basemapChange when basemap changes', () => 
{
        const emitSpy = spyOn(component.basemapChange, 'emit');

        const select = createSelect('satellite');
        component.onBasemapSelectChange(select);

        expect(emitSpy).toHaveBeenCalledOnceWith('satellite');
    });

    it('renders 3 selects when basemaps are provided (Decades, Stay, Basemap)', () => 
{
        const selects = fixture.debugElement.queryAll(By.css('select'));
        expect(selects.length).toBe(3);
    });

    it('hides basemap select when basemaps is empty', () => 
{
        component.basemaps = [];
        fixture.detectChanges();

        const selects = fixture.debugElement.queryAll(By.css('select'));
        expect(selects.length).toBe(2);
    });

    function createSelect(value: string)
    {
        const select = document.createElement('select');

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.text = 'Decades';
        select.appendChild(placeholder);

        const opt = document.createElement('option');
        opt.value = value;
        opt.text = value;
        select.appendChild(opt);

        select.value = value;

        return select;
    }

    it('onDecadeSelectChange returns without emitting when target is null', () =>
    {
        const emitSpy = spyOn(component.decadeChange, 'emit');

        component.onDecadeSelectChange(null);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('onStayDurationSelectChange returns without emitting when target is null', () =>
    {
        const emitSpy = spyOn(component.stayDurationChange, 'emit');

        component.onStayDurationSelectChange(null);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('onBasemapSelectChange returns without emitting when target is null', () =>
    {
        const emitSpy = spyOn(component.basemapChange, 'emit');

        component.onBasemapSelectChange(null);

        expect(emitSpy).not.toHaveBeenCalled();
    });


});