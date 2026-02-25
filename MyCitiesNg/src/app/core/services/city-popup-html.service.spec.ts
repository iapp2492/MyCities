import { CityPopupHtmlService } from './city-popup-html.service';
import type { MyCityDto } from '../../../models/myCityDto';
import { TestBed } from '@angular/core/testing';

describe('CityPopupHtmlService', () =>
{
    let service: CityPopupHtmlService;

    beforeEach(() =>
    {
        TestBed.configureTestingModule(
        {
            providers: [CityPopupHtmlService]
        });

        service = TestBed.inject(CityPopupHtmlService);
    });

    it('build should escape &, <, >, ", and apostrophes', () =>
    {
        const city = {
            city: `a&b<c>d"e'f`,
            country: `a&b<c>d"e'f`,
            stayDuration: `a&b<c>d"e'f`,
            decades: `a&b<c>d"e'f`,
            notes: `a&b<c>d"e'f`
        } as unknown as MyCityDto;

        const html = service.build(city);

        expect(html).toContain('a&amp;b&lt;c&gt;d&quot;e&#039;f');
        // Optional: ensure the raw string is NOT present
        expect(html).not.toContain(`a&b<c>d"e'f`);
    });

    it('build should omit notes block when notes are blank', () =>
    {
        const city = {
            city: 'X',
            country: 'Y',
            notes: '   '
        } as unknown as MyCityDto;

        const html = service.build(city);

        expect(html).not.toContain('Notes:');
    });

    describe('build()', () =>
    {
        it('includes Notes block when notes has non-whitespace content', () =>
        {
            const city: MyCityDto =
            {
                id: 1,
                city: 'Test City',
                country: 'Test Country',
                region: 'Test Region',
                notes: '  Hello world  ',
                lat: 0,
                lon: 0,
                stayDuration: '',
                decades: ''
            };

            const html = service.build(city);

            expect(html).toContain('Notes:');
            expect(html).toContain('Hello world');
            expect(html).toContain('white-space: pre-wrap');
        });

        it('omits Notes block when notes is only whitespace (trim => empty)', () =>
        {
            const city: MyCityDto =
            {
                id: 2,
                city: 'Test City',
                country: 'Test Country',
                region: 'Test Region',
                notes: '     ',
                lat: 0,
                lon: 0,
                stayDuration: '',
                decades: ''
            };

            const html = service.build(city);

            expect(html).not.toContain('Notes:');
            expect(html).not.toContain('white-space: pre-wrap');
        });

        it('escapes HTML to prevent injection', () =>
        {
            const city: MyCityDto =
            {
                id: 3,
                city: '<script>alert(1)</script>',
                country: 'A&B',
                region: '',
                notes: '"quoted"',
                lat: 0,
                lon: 0,
                stayDuration: '',
                decades: ''
            };

            const html = service.build(city);

            expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
            expect(html).toContain('A&amp;B');
            expect(html).toContain('&quot;quoted&quot;');
        });

        it('includes Stay and Decades blocks when present', () =>
        {
            const city: MyCityDto =
            {
                id: 4,
                city: 'City',
                country: 'Country',
                region: '',
                notes: '',
                lat: 0,
                lon: 0,
                stayDuration: '2 years',
                decades: '1990s'
            };

            const html = service.build(city);

            expect(html).toContain('Stay:');
            expect(html).toContain('2 years');
            expect(html).toContain('Decades:');
            expect(html).toContain('1990s');
        }); 

        it('omits Stay and Decades blocks when values are blank', () =>
        {
            const city: MyCityDto =
            {
                id: 14,
                city: 'X',
                country: 'Y',
                region: '',
                notes: '',
                lat: 0,
                lon: 0,
                stayDuration: '   ',
                decades: ''
            };

            const html = service.build(city);

            expect(html).not.toContain('Stay:');
            expect(html).not.toContain('Decades:');
        });   
        
        it('build should handle null/undefined values (covers value ?? "")', () =>
        {
            const city =
            {
                city: undefined,
                country: null,
                stayDuration: undefined,
                decades: null,
                notes: undefined
            } as unknown as MyCityDto;

            const html = service.build(city);

            // City title is present but empty
            expect(html).toContain('<div style="font-weight: 700; margin-bottom: 6px;">');
            expect(html).toContain('</div>');

            // Country label still renders, but value is empty
            expect(html).toContain('<div><b>Country:</b> </div>');

            // Optional blocks should be omitted because trim() never produces content
            expect(html).not.toContain('Stay:');
            expect(html).not.toContain('Decades:');
            expect(html).not.toContain('Notes:');
        });

    });
});