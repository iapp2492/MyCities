import { Routes } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LeafletMapComponent } from './maps/leaflet-map/leaflet-map.component';
import { GoogleMapComponent } from './maps/google-map/google-map.component';
import { MapboxMapComponent } from './maps/mapbox-map/mapbox-map.component';

export const routes: Routes = [
  {
    path: '',
    component: WelcomeComponent
  },  // Map routes
  {
    path: 'map/leaflet',
    component: LeafletMapComponent
  },
  {
    path: 'map/google',
    component: GoogleMapComponent
  },
  {
    path: 'map/mapbox',
    component: MapboxMapComponent
  },

  {
    path: '**',
    redirectTo: ''
  }
];
