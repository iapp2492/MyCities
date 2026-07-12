import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { App } from './app';
import { AnalyticsService } from './core/services/analytics.service';

class AnalyticsServiceMock
{
    pageView = jasmine.createSpy('pageView');
}

describe('App', () =>
{
    let fixture: ComponentFixture<App>;
    let routerEvents$: Subject<unknown>;
    let analyticsService: AnalyticsServiceMock;

    beforeEach(async () =>
    {
        routerEvents$ = new Subject<unknown>();

        await TestBed.configureTestingModule({
            imports: [App],
            providers:
            [
                {
                    provide: Router,
                    useValue:
                    {
                        events: routerEvents$.asObservable(),
                    },
                },
                {
                    provide: AnalyticsService,
                    useClass: AnalyticsServiceMock,
                },
            ],
        }).compileComponents();

        analyticsService = TestBed.inject(AnalyticsService) as unknown as AnalyticsServiceMock;
    });

    afterEach(() =>
    {
        routerEvents$.complete();
    });

    it('should create the app', () =>
    {
        fixture = TestBed.createComponent(App);

        expect(fixture.componentInstance).toBeTruthy();
    });

    it('ngOnInit should send an initial page view', () =>
    {
        fixture = TestBed.createComponent(App);

        fixture.componentInstance.ngOnInit();

        expect(analyticsService.pageView).toHaveBeenCalledOnceWith(
            window.location.pathname + window.location.search,
            document.title
        );
    });

    it('ngOnInit should send a page view after NavigationEnd', () =>
    {
        fixture = TestBed.createComponent(App);

        fixture.componentInstance.ngOnInit();
        analyticsService.pageView.calls.reset();

        routerEvents$.next(
            new NavigationEnd(
                1,
                '/old-url',
                '/new-url'
            )
        );

        expect(analyticsService.pageView).toHaveBeenCalledOnceWith(
            window.location.pathname + window.location.search,
            document.title
        );
    });

    it('ngOnInit should ignore router events that are not NavigationEnd', () =>
    {
        fixture = TestBed.createComponent(App);

        fixture.componentInstance.ngOnInit();
        analyticsService.pageView.calls.reset();

        routerEvents$.next({});

        expect(analyticsService.pageView).not.toHaveBeenCalled();
    });
});