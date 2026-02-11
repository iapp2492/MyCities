import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapboxMapComponent } from './mapbox-map.component';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import { MyCitiesStoreMock } from '../../../testing/my-cities-store.mock'; 

describe('MapboxMapComponent', () => 
{
    let component: MapboxMapComponent;
    let fixture: ComponentFixture<MapboxMapComponent>;

    beforeEach(async () => 
    {
        await TestBed.configureTestingModule(
        {
            imports: [MapboxMapComponent],
            providers: [{ provide: MyCitiesStoreService, useClass: MyCitiesStoreMock }]
        }).compileComponents();

        fixture = TestBed.createComponent(MapboxMapComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => 
    {
        expect(component).toBeTruthy();
    });
});
