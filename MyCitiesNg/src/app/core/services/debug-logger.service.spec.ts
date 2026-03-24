import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DebugLoggerService } from './debug-logger.service';
import { environment } from '../../../environments/environment';

describe('DebugLoggerService', () =>
{
    let service: DebugLoggerService;

    beforeEach(() =>
    {
        TestBed.configureTestingModule({});
        service = TestBed.inject(DebugLoggerService);
    });

    describe('when logging disabled', () =>
    {
        beforeEach(() =>
        {
            environment.enableDebugLogging = false;
        });

        it('log should not call console.log', () =>
        {
            spyOn(console, 'log');

            service.log('msg');

            expect(console.log).not.toHaveBeenCalled();
        });

        it('warn should not call console.warn', () =>
        {
            spyOn(console, 'warn');

            service.warn('msg');

            expect(console.warn).not.toHaveBeenCalled();
        });

        it('error should not call console.error', () =>
        {
            spyOn(console, 'error');

            service.error('msg');

            expect(console.error).not.toHaveBeenCalled();
        });

        it('debugTap should not log', () =>
        {
            spyOn(console, 'log');

            of(123).pipe(service.debugTap('test')).subscribe();

            expect(console.log).not.toHaveBeenCalled();
        });
    });

    describe('when logging enabled', () =>
    {
        beforeEach(() =>
        {
            environment.enableDebugLogging = true;
        });

        it('log without data', () =>
        {
            spyOn(console, 'log');

            service.log('hello');

            expect(console.log).toHaveBeenCalledWith('hello');
        });

        it('log with data', () =>
        {
            spyOn(console, 'log');

            service.log('hello', 42);

            expect(console.log).toHaveBeenCalledWith('hello', 42);
        });

        it('warn without data', () =>
        {
            spyOn(console, 'warn');

            service.warn('warn');

            expect(console.warn).toHaveBeenCalledWith('warn');
        });

        it('warn with data', () =>
        {
            spyOn(console, 'warn');

            service.warn('warn', { a: 1 });

            expect(console.warn).toHaveBeenCalledWith('warn', { a: 1 });
        });

        it('error without data', () =>
        {
            spyOn(console, 'error');

            service.error('err');

            expect(console.error).toHaveBeenCalledWith('err');
        });

        it('error with data', () =>
        {
            spyOn(console, 'error');

            service.error('err', 'x');

            expect(console.error).toHaveBeenCalledWith('err', 'x');
        });

        it('debugTap without formatter', () =>
        {
            spyOn(console, 'log');

            of(5).pipe(service.debugTap<number>('label')).subscribe();

            expect(console.log).toHaveBeenCalledWith('label', 5);
        });

        it('debugTap with formatter', () =>
        {
            spyOn(console, 'log');

            of(5)
                .pipe(service.debugTap<number>('label', v => v * 2))
                .subscribe();

            expect(console.log).toHaveBeenCalledWith('label', 10);
        });
    });
});