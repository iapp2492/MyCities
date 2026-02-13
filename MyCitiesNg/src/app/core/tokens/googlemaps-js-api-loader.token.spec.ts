// Although a test like this is normally not strictly necessary or useful, it was required to achieve 100% code coverage 
import { TestBed } from '@angular/core/testing';
import { GOOGLEMAPS_JS_API_LOADER, GoogleMapsJsApiLoaderLike } from './googlemaps-js-api-loader.token';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

describe('GOOGLEMAPS_JS_API_LOADER token', () =>
{
    it('should resolve from DI and expose expected functions', () =>
    {
        TestBed.configureTestingModule({});

        const loader = TestBed.inject<GoogleMapsJsApiLoaderLike>(GOOGLEMAPS_JS_API_LOADER);

        expect(loader).toBeTruthy();
        expect(loader.setOptions).toBe(setOptions);
        expect(loader.importLibrary).toBe(importLibrary);
    });
});