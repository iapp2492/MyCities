import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MapFiltersBarComponent, BasemapOption } from './map-filters-bar.component';
import { Component } from '@angular/core';

@Component(
{
    standalone: true,
    template: ''
})
class DummyRouteComponent
{
}

describe('MapFiltersBarComponent', () =>
{
    let component: MapFiltersBarComponent;
    let fixture: ComponentFixture<MapFiltersBarComponent>;

    beforeEach(async () =>
    {
        await TestBed.configureTestingModule(
        {
            imports: [MapFiltersBarComponent],
            providers: [
                provideRouter(
                [
                    { path: 'map/:engine', component: DummyRouteComponent }
                ])]
        })
        .compileComponents();

        fixture = TestBed.createComponent(MapFiltersBarComponent);
        component = fixture.componentInstance;

        component.decades$ = of(['1990s', '2000s']);
        component.stayDurations$ = of(['1 mo', '3-5 mos']);
        component.basemaps =
        [
            { value: 'roadmap', label: 'Roadmap' },
            { value: 'satellite', label: 'Satellite' }
        ] satisfies BasemapOption[];

        component.selectedDecade = null;
        component.selectedStayDuration = null;
        component.selectedBasemap = 'roadmap';

        fixture.detectChanges();
    });

    for (const saved of [
        { value: 'humanitarian', label: 'Humanitarian', defaultValue: 'standard' },
        { value: 'navNight', label: 'Navigation Night', defaultValue: 'standard' },
        { value: 'hybrid', label: 'Hybrid', defaultValue: 'roadmap' }
    ])
    {
        it('renders the saved basemap on first render: ' + saved.value, async () =>
        {
            const returningFixture = TestBed.createComponent(MapFiltersBarComponent);
            returningFixture.componentRef.setInput('decades$', of([]));
            returningFixture.componentRef.setInput('locations$', of([]));
            returningFixture.componentRef.setInput('stayDurations$', of([]));
            returningFixture.componentRef.setInput('basemaps', [
                { value: saved.defaultValue, label: 'Default' },
                { value: saved.value, label: saved.label }
            ]);
            returningFixture.componentRef.setInput('selectedBasemap', saved.value);
            const emitSpy = spyOn(returningFixture.componentInstance.basemapChange, 'emit');

            returningFixture.detectChanges();
            await returningFixture.whenStable();
            returningFixture.detectChanges();

            const select: HTMLSelectElement = returningFixture.nativeElement.querySelector('select');
            expect(select.value).toBe(saved.value);
            expect(select.selectedOptions[0]?.textContent).toContain(saved.label);
            expect(emitSpy).not.toHaveBeenCalled();
            returningFixture.destroy();
        });
    }

    it('should create', () =>
    {
        expect(component).toBeTruthy();
    });

    it('emits basemapChange when basemap changes', () =>
    {
        const emitSpy = spyOn(component.basemapChange, 'emit');

        const select = createSelect('satellite');
        component.onBasemapSelectChange(select);

        expect(emitSpy).toHaveBeenCalledOnceWith('satellite');
    });

    it('emits the basemap value from a real dropdown change', async () =>
    {
        await fixture.whenStable();
        const emitSpy = spyOn(component.basemapChange, 'emit');
        const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
        select.value = 'satellite';
        select.dispatchEvent(new Event('change'));

        expect(emitSpy).toHaveBeenCalledOnceWith('satellite');
    });

    it('renders 3 selects when basemaps are provided (Decades, Stay, Basemap)', () =>
    {
        const selects = fixture.debugElement.queryAll(By.css('select'));
        expect(selects.length).toBe(4);
    });

    it('hides basemap select when basemaps is empty', () =>
    {
        component.basemaps = [];
        fixture.detectChanges();

        const selects = fixture.debugElement.queryAll(By.css('select'));
        expect(selects.length).toBe(3);
    });

    it('onBasemapSelectChange returns without emitting when target is null', () =>
    {
        const emitSpy = spyOn(component.basemapChange, 'emit');

        component.onBasemapSelectChange(null);

        expect(emitSpy).not.toHaveBeenCalled();
    });

    function createSelect(value: string): HTMLSelectElement
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

    it('initializes currentEngine from the current router url', () =>
    {
        const router = TestBed.inject(Router);

        spyOnProperty(router, 'url', 'get').and.returnValue('/map/google');

        const localFixture = TestBed.createComponent(MapFiltersBarComponent);
        const localComponent = localFixture.componentInstance;

        localComponent.decades$ = of(['1990s', '2000s']);
        localComponent.stayDurations$ = of(['1 mo', '3-5 mos']);
        localComponent.basemaps =
        [
            { value: 'roadmap', label: 'Roadmap' },
            { value: 'satellite', label: 'Satellite' }
        ] satisfies BasemapOption[];

        localFixture.detectChanges();

        expect(localComponent.currentEngine).toBe('google');
    });

    it('onEngineChange updates currentEngine immediately and navigates with merged query params', () =>
    {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

        component.currentEngine = 'leaflet';

        component.onEngineChange('mapbox');

        expect(component.currentEngine).toBe('mapbox');
        expect(navigateSpy).toHaveBeenCalledOnceWith(
            ['/map', 'mapbox'],
            { queryParamsHandling: 'merge' }
        );
    });

    it('updates currentEngine when a NavigationEnd occurs', async () =>
    {
        const router = TestBed.inject(Router);

        await router.navigateByUrl('/map/leaflet');

        const localFixture = TestBed.createComponent(MapFiltersBarComponent);
        const localComponent = localFixture.componentInstance;

        localComponent.decades$ = of(['1990s', '2000s']);
        localComponent.stayDurations$ = of(['1 mo', '3-5 mos']);
        localComponent.basemaps =
        [
            { value: 'roadmap', label: 'Roadmap' },
            { value: 'satellite', label: 'Satellite' }
        ] satisfies BasemapOption[];

        localFixture.detectChanges();

        expect(localComponent.currentEngine).toBe('leaflet');

        await router.navigateByUrl('/map/google');
        localFixture.detectChanges();

        expect(localComponent.currentEngine).toBe('google');
    });
});