import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WelcomeComponent } from './welcome.component';
import { Router } from '@angular/router';

describe('WelcomeComponent', () => 
{
    let component: WelcomeComponent;
    let fixture: ComponentFixture<WelcomeComponent>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => 
    {
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

        await TestBed.configureTestingModule(
        {
            imports: [WelcomeComponent],
            providers:
            [
                { provide: Router, useValue: routerSpy }
            ]
        })
        .compileComponents();

        fixture = TestBed.createComponent(WelcomeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => 
    {
        expect(component).toBeTruthy();
    });

    it('should navigate to Leaflet map', () => 
    {
        component.goToLeaflet();

        expect(routerSpy.navigate)
            .toHaveBeenCalledWith(['/map/leaflet']);
    });

    it('should navigate to Mapbox map', () => 
    {
        component.goToMapbox();

        expect(routerSpy.navigate)
            .toHaveBeenCalledWith(['/map/mapbox']);
    });

    it('should navigate to Google map', () => 
    {
        component.goToGoogle();

        expect(routerSpy.navigate)
            .toHaveBeenCalledWith(['/map/google']);
    });
});
