import { inject, Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { GOOGLEMAPS_JS_API_LOADER, GoogleMapsJsApiLoaderLike } from '../tokens/googlemaps-js-api-loader.token';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService
{
    // This service is a simple wrapper around the @googlemaps/js-api-loader functions.
    // It was created because we need to be able to have a read/writer version of setOptions  
    private readonly loader: GoogleMapsJsApiLoaderLike = inject(GOOGLEMAPS_JS_API_LOADER);

    public setOptions(options: Parameters<typeof setOptions>[0]): void
    {
        this.loader.setOptions(options);
    }

    public importLibrary<T extends Parameters<typeof importLibrary>[0]>(
        lib: T
    ): ReturnType<typeof importLibrary>
    {
        return this.loader.importLibrary(lib);
    }
}
