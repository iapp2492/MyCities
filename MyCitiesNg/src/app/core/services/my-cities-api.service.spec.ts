import { TestBed } from '@angular/core/testing';import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MyCitiesApiService } from './my-cities-api.service';
import { MyCityDto } from '../../../models/myCityDto';
import { API_BASE_URL } from '../tokens/api-base-url.token';

describe('MyCitiesApiService', () =>
{
    let service: MyCitiesApiService;
    let httpMock: HttpTestingController;

    beforeEach(() =>
    {
        // Set BEFORE the service is injected because apiBaseUrl is read at construction time.
        TestBed.configureTestingModule(
        {
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                MyCitiesApiService,
                { provide: API_BASE_URL, useValue: 'https://example.test/api/' }
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
});
