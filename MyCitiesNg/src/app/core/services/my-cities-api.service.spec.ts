import { TestBed } from '@angular/core/testing';import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MyCitiesApiService } from './my-cities-api.service';
import { MyCityDto } from '../../../models/myCityDto';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { MyCityPhotosResponseDto } from '../../../models/MyCityPhotosResponseDto';
import { DebugLoggerService } from './debug-logger.service';

describe('MyCitiesApiService', () =>
{
    let service: MyCitiesApiService;
    let httpMock: HttpTestingController;
    const baseUrl = 'https://example.test/api/';

    beforeEach(() =>
    {
        // Set BEFORE the service is injected because apiBaseUrl is read at construction time.
        TestBed.configureTestingModule(
        {
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                MyCitiesApiService,
                { provide: API_BASE_URL, useValue: baseUrl },
                {
                    provide: DebugLoggerService,
                    useValue:
                    {
                        log: jasmine.createSpy('log'),
                        warn: jasmine.createSpy('warn'),
                        error: jasmine.createSpy('error')
                    }
                }
            ]
        });

        service = TestBed.inject(MyCitiesApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() =>
    {
        httpMock.verify();
    });

    it('calls GET {dataserviceroot}MyCities/GetAllCities', () =>
    {
        const expectedUrl = 'https://example.test/api/MyCities/GetAllCities';

        service.getAllCities().subscribe();

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');

        req.flush([]);
    });

    it('returns cities from the API response', () =>
    {
        const expectedUrl = 'https://example.test/api/MyCities/GetAllCities';

        const mockCities: MyCityDto[] = [
            {
                id: 1,
                city: 'Arusha',
                country: 'Tanzania',
                region: 'Africa',
                lat: -3.3869,
                lon: 36.6830,
                stayDuration: '3-5 mos',
                decades: '2020s',
                notes: 'Lived here for a few months while volunteering at a local school.'
            } as MyCityDto,
            {
                id: 2,
                city: 'Monterrey',
                country: 'Mexico',
                region: 'North America',
                lat: 25.6866,
                lon: -100.3161,
                stayDuration: '1 mo',
                decades: '2020s',
                notes: 'Visited for a month to explore the city and its surroundings.'
            } as MyCityDto
        ];

        let actual: MyCityDto[] | undefined;

        service.getAllCities().subscribe((cities) =>
        {
            actual = cities;
        });

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('GET');

        req.flush(mockCities);

        expect(actual).toEqual(mockCities);
    });

    it('getAllPhotos should call the GetAllPhotos endpoint and return the response', () =>
    {
        const mockResponse: MyCityPhotosResponseDto[] =
        [
            {
                photoKey: 1,
                photos:
                [
                    {
                        photoKey: 1,
                        photoIndex: 1,
                        sortOrder: 1,
                        title: 'Main photo',
                        caption: 'Caption 1',
                        fileName: 'photo1.jpg',
                        url: 'https://example.test/photos/photo1.jpg'
                    }
                ]
            }
        ];

        service.getAllPhotos().subscribe((response) =>
        {
            expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${baseUrl}MyCities/GetAllPhotos`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
    });

    it('getActivePhotoKeys should call the GetActivePhotoKeys endpoint and return the response', () =>
    {
        const mockResponse: number[] = [1, 2, 5, 9];

        service.getActivePhotoKeys().subscribe((response) =>
        {
            expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${baseUrl}MyCities/GetActivePhotoKeys`);
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
    });

});