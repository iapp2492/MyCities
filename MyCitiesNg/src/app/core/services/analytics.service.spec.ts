import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () =>
{
    let service: AnalyticsService;
    let originalGtag: Window['gtag'] | undefined;

    beforeEach(() =>
    {
        originalGtag = window.gtag;

        TestBed.configureTestingModule({});

        service = TestBed.inject(AnalyticsService);
    });

    afterEach(() =>
    {
        window.gtag = originalGtag;
    });

    it('should be created', () =>
    {
        expect(service).toBeTruthy();
    });

    it('event should call gtag with event name and provided params', () =>
    {
        const gtagSpy = jasmine.createSpy('gtag');
        window.gtag = gtagSpy;

        service.event('basemap_changed', {
            engine: 'Mapbox',
            basemap: 'Satellite',
        });

        expect(gtagSpy).toHaveBeenCalledOnceWith(
            'event',
            'basemap_changed',
            {
                engine: 'Mapbox',
                basemap: 'Satellite',
            });
    });

    it('event should use an empty params object when params are omitted', () =>
    {
        const gtagSpy = jasmine.createSpy('gtag');
        window.gtag = gtagSpy;

        service.event('photo_view_opened');

        expect(gtagSpy).toHaveBeenCalledOnceWith(
            'event',
            'photo_view_opened',
            {});
    });

    it('event should do nothing when gtag is not available', () =>
    {
        window.gtag = undefined;

        expect(() =>
        {
            service.event('city_popup_opened', {
                city: 'Panama City',
            });
        }).not.toThrow();
    });

    it('pageView should call gtag config with page path and title', () =>
    {
        const gtagSpy = jasmine.createSpy('gtag');
        window.gtag = gtagSpy;

        service.pageView('/mycities/mapbox', 'MyCities Mapbox');

        expect(gtagSpy).toHaveBeenCalledOnceWith(
            'config',
            'G-Y7N92J73K3',
            {
                page_path: '/mycities/mapbox',
                page_title: 'MyCities Mapbox',
            });
    });

    it('pageView should do nothing when gtag is not available', () =>
    {
        window.gtag = undefined;

        expect(() =>
        {
            service.pageView('/mycities', 'MyCities');
        }).not.toThrow();
    });
});