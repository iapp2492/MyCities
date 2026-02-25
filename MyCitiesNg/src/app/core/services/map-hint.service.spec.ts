import { MapHintPresenter, MapHintService} from './map-hint.service';

describe('MapHintService', () =>
{
    let service: MapHintService;

    beforeEach(() =>
    {
        service = new MapHintService();
    });

    describe('shouldShow', () =>
    {
        it('returns true when stored version is missing', () =>
        {
            spyOn(localStorage, 'getItem').and.returnValue(null);

            const result = service.shouldShow('mapbox');

            expect(result).toBeTrue();
        });

        it('returns true when stored version differs from currentVersion', () =>
        {
            spyOn(localStorage, 'getItem').and.callFake((key: string) =>
            {
                if (key.includes('.version'))
                {
                    return '999';
                }

                return null;
            });

            const result = service.shouldShow('leaflet');

            expect(result).toBeTrue();
        });

        it('returns true when lastShownUtc is missing', () =>
        {
            spyOn(localStorage, 'getItem').and.callFake((key: string) =>
            {
                if (key.includes('.version'))
                {
                    return '1';
                }

                if (key.includes('.lastShownUtc'))
                {
                    return null;
                }

                return null;
            });

            const result = service.shouldShow('google');

            expect(result).toBeTrue();
        });

        it('returns false when lastShownUtc is within the cooldown window', () =>
        {
            const now = 1_000_000_000;
            const withinCooldown = now - 1000; // 1 second ago

            spyOn(Date, 'now').and.returnValue(now);

            spyOn(localStorage, 'getItem').and.callFake((key: string) =>
            {
                if (key.includes('.version'))
                {
                    return '1';
                }

                if (key.includes('.lastShownUtc'))
                {
                    return String(withinCooldown);
                }

                return null;
            });

            const result = service.shouldShow('mapbox');

            expect(result).toBeFalse();
        });

        it('returns true when lastShownUtc is older than the cooldown window', () =>
        {
            const now = 1_000_000_000;

            // cooldown is 7 days; go older than that
            const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
            const olderThanCooldown = now - eightDaysMs;

            spyOn(Date, 'now').and.returnValue(now);

            spyOn(localStorage, 'getItem').and.callFake((key: string) =>
            {
                if (key.includes('.version'))
                {
                    return '1';
                }

                if (key.includes('.lastShownUtc'))
                {
                    return String(olderThanCooldown);
                }

                return null;
            });

            const result = service.shouldShow('leaflet');

            expect(result).toBeTrue();
        });

        it('returns true and logs when localStorage.getItem throws', () =>
        {
            spyOn(localStorage, 'getItem').and.throwError('boom');
            const consoleSpy = spyOn(console, 'error').and.stub();

            const result = service.shouldShow('google');

            expect(result).toBeTrue();
            expect(consoleSpy).toHaveBeenCalled();

            const args = consoleSpy.calls.argsFor(0);
            expect(String(args[0])).toContain('shouldShow');
            expect(args[1] instanceof Error).toBeTrue();
        });

        it('returns true when stored values are non-numeric', () =>
        {
            spyOn(localStorage, 'getItem').and.callFake((key: string) =>
            {
                if (key.includes('.version'))
                {
                    return '1';
                }

                if (key.includes('.lastShownUtc'))
                {
                    return 'not-a-number';
                }

                return null;
            });

            const result = service.shouldShow('mapbox');

            // Non-numeric lastShownUtc is treated as null -> show
            expect(result).toBeTrue();
        });
    });

    describe('markShown', () =>
    {
        it('stores version and lastShownUtc keys for the engine', () =>
        {
            const setSpy = spyOn(localStorage, 'setItem');
            spyOn(Date, 'now').and.returnValue(12345);

            service.markShown('mapbox');

            expect(setSpy).toHaveBeenCalledWith('mycities.mapHint.mapbox.version', '1');
            expect(setSpy).toHaveBeenCalledWith('mycities.mapHint.mapbox.lastShownUtc', '12345');
        });

        it('logs and does not throw when localStorage.setItem throws', () =>
        {
            spyOn(localStorage, 'setItem').and.throwError('boom');
            const consoleSpy = spyOn(console, 'error');

            expect(() => service.markShown('leaflet')).not.toThrow();
            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('showOnceIfNeeded', () =>
    {
        it('shows the hint and marks it shown (current behavior with shouldShow guard commented out)', () =>
        {
            const presenter: MapHintPresenter =
            {
                showHint: jasmine.createSpy('showHint')
            };

            const markSpy = spyOn(service, 'markShown').and.callThrough();

            service.showOnceIfNeeded('google', presenter);

            expect(presenter.showHint).toHaveBeenCalledWith('Tip: Tap a marker to see city details.');
            expect(markSpy).toHaveBeenCalledWith('google');
        });

        xit('does not show the hint when shouldShow returns false (enable after uncommenting guard)', () =>
        {
            const presenter: MapHintPresenter =
            {
                showHint: jasmine.createSpy('showHint')
            };

            spyOn(service, 'shouldShow').and.returnValue(false);
            const markSpy = spyOn(service, 'markShown');

            service.showOnceIfNeeded('mapbox', presenter);

            expect(presenter.showHint).not.toHaveBeenCalled();
            expect(markSpy).not.toHaveBeenCalled();
        });
    });
});