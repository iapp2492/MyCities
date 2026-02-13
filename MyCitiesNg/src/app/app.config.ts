import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { environment } from '../environments/environment';
import { MAPBOX_FACTORY, MAPBOX_FACTORY_IMPL } from '../app/core/map/mapbox.factory';

export const appConfig: ApplicationConfig = 
{
    // Start this application with these global services.
    providers: 
    [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(), 
        provideRouter(routes),
        { provide: API_BASE_URL, useValue: environment.dataserviceroot },
         { provide: MAPBOX_FACTORY, useValue: MAPBOX_FACTORY_IMPL }
    ]
};