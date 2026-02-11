import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleMapComponent } from './google-map.component';
import { MyCitiesStoreService } from '../../core/services/my-cities-store.service';
import { MyCitiesStoreMock } from '../../../testing/my-cities-store.mock'; 

describe('GoogleMapComponent', () => 
{
  let component: GoogleMapComponent;
  let fixture: ComponentFixture<GoogleMapComponent>;

  beforeEach(async () => 
{
    await TestBed.configureTestingModule({
      imports: [GoogleMapComponent],
        providers: [{ provide: MyCitiesStoreService, useClass: MyCitiesStoreMock }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => 
{
    expect(component).toBeTruthy();
  });
});
