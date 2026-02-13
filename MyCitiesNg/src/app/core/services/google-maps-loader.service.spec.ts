import { TestBed } from '@angular/core/testing';
import { GoogleMapsLoaderService } from './google-maps-loader.service';
import { GOOGLEMAPS_JS_API_LOADER, GoogleMapsJsApiLoaderLike } from '../tokens/googlemaps-js-api-loader.token';

describe('GoogleMapsLoaderService', () =>
{
    let service: GoogleMapsLoaderService;
    let loaderMock: GoogleMapsJsApiLoaderLike;

    beforeEach(() =>
    {
        loaderMock =
        {
            setOptions: jasmine.createSpy('setOptions'),
            importLibrary: jasmine.createSpy('importLibrary')
        };

        TestBed.configureTestingModule(
        {
            providers:
            [
                GoogleMapsLoaderService,
                { provide: GOOGLEMAPS_JS_API_LOADER, useValue: loaderMock }
            ]
        });

        service = TestBed.inject(GoogleMapsLoaderService);
    });

    it('setOptions forwards options to loader', () =>
    {
        const options = { apiKey: 'TEST_KEY' } as unknown as Parameters<GoogleMapsJsApiLoaderLike['setOptions']>[0];

        service.setOptions(options);

        expect(loaderMock.setOptions).toHaveBeenCalledTimes(1);
        expect(loaderMock.setOptions).toHaveBeenCalledWith(options);
    });

    it('importLibrary forwards the library name and returns the same Promise instance', () =>
    {
        const fakePromise = Promise.resolve({ anything: true }) as unknown;

        (loaderMock.importLibrary as jasmine.Spy).and.returnValue(fakePromise);

        const resultPromise = service.importLibrary('maps');

        expect(loaderMock.importLibrary).toHaveBeenCalledTimes(1);
        expect(loaderMock.importLibrary).toHaveBeenCalledWith('maps');
        expect(resultPromise as unknown).toBe(fakePromise);
    });

    it('importLibrary propagates rejections from the loader', async () =>
    {
        const err = new Error('boom');
        const fakeRejectPromise = Promise.reject(err) as unknown;

        (loaderMock.importLibrary as jasmine.Spy).and.returnValue(fakeRejectPromise);

        await expectAsync(service.importLibrary('maps')).toBeRejectedWith(err);
    });
});