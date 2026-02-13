import { InjectionToken } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface GoogleMapsJsApiLoaderLike
{
    setOptions(options: Parameters<typeof setOptions>[0]): void;

    importLibrary<T extends Parameters<typeof importLibrary>[0]>(
        lib: T
    ): ReturnType<typeof importLibrary>;
}

export const GOOGLEMAPS_JS_API_LOADER = new InjectionToken<GoogleMapsJsApiLoaderLike>(
    'GOOGLEMAPS_JS_API_LOADER',
    {
        providedIn: 'root',
        factory: () =>
        ({
            setOptions,
            importLibrary
        })
    }
);