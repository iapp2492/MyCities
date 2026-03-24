import { inject, Injectable } from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
import { GOOGLEMAPS_JS_API_LOADER, GoogleMapsJsApiLoaderLike } from '../tokens/googlemaps-js-api-loader.token';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService
{
    // This service is a simple wrapper around the @googlemaps/js-api-loader functions.
    // It also ensures that setOptions() is only called once.
    private readonly loader: GoogleMapsJsApiLoaderLike = inject(GOOGLEMAPS_JS_API_LOADER);
    private optionsInitialized = false;

    private ensureOptionsSet(): void
    {
        if (this.optionsInitialized)
        {
            return;
        }

        this.loader.setOptions(
        {
            key: environment.googleMapsApiKey,
            v: 'weekly'
        });

        this.optionsInitialized = true;
    }

    public importLibrary<T extends Parameters<typeof importLibrary>[0]>(
        lib: T
    ): ReturnType<typeof importLibrary>
    {
        this.ensureOptionsSet();
        return this.loader.importLibrary(lib);
    }
}