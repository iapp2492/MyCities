import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';

import { PhotoViewerComponent } from './photo-viewer.component';
import { MyCitiesApiService } from '../core/services/my-cities-api.service';
import { DebugLoggerService } from '../core/services/debug-logger.service';

class MockSwiperContainerElement extends HTMLElement
{
    public swiper =
    {
        params:
        {
            preventClicks: true,
            preventClicksPropagation: true,
            touchStartPreventDefault: true
        },
        update: jasmine.createSpy('update'),
        navigation:
        {
            init: jasmine.createSpy('nav.init'),
            update: jasmine.createSpy('nav.update')
        },
        pagination:
        {
            render: jasmine.createSpy('pagination.render'),
            update: jasmine.createSpy('pagination.update')
        }
    };

    public initialize = jasmine.createSpy('initialize');
}

describe('PhotoViewerComponent', () =>
{
    let component: PhotoViewerComponent;
    let fixture: ComponentFixture<PhotoViewerComponent>;

    let apiSpy:
    {
        getAllPhotos: jasmine.Spy;
    };

    let debugLoggerSpy:
    {
        log: jasmine.Spy;
        warn: jasmine.Spy;
        error: jasmine.Spy;
    };

    beforeAll(() =>
    {
        if (!customElements.get('swiper-container'))
        {
            customElements.define('swiper-container', MockSwiperContainerElement);
        }
    });

    beforeEach(async () =>
    {
        apiSpy =
        {
            getAllPhotos: jasmine.createSpy('getAllPhotos').and.returnValue(of([]))
        };

        debugLoggerSpy =
        {
            log: jasmine.createSpy('log'),
            warn: jasmine.createSpy('warn'),
            error: jasmine.createSpy('error')
        };

        await TestBed.configureTestingModule(
        {
            imports: [PhotoViewerComponent],
            providers:
            [
                { provide: MyCitiesApiService, useValue: apiSpy },
                { provide: DebugLoggerService, useValue: debugLoggerSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PhotoViewerComponent);
        component = fixture.componentInstance;
    });

    it('should create', () =>
    {
        expect(component).toBeTruthy();
    });

    it('should set invalid photo key error when photoKey is not valid', () =>
    {
        component.photoKey = 0;

        component.ngOnChanges(
        {
            photoKey: new SimpleChange(null, 0, true)
        });

        expect(component.photos).toEqual([]);
        expect(component.errorMessage).toBe('Invalid photo key.');
        expect(apiSpy.getAllPhotos).not.toHaveBeenCalled();
    });

    it('should call api and populate photos for a valid photoKey', fakeAsync(() =>
    {
        apiSpy.getAllPhotos.and.returnValue(of(
        [
            {
                photoKey: 5,
                photos:
                [
                    {
                        photoIndex: 2,
                        sortOrder: 2,
                        title: 'Second',
                        caption: 'Caption 2',
                        fileName: '5-2.jpg'
                    },
                    {
                        photoIndex: 1,
                        sortOrder: 1,
                        title: 'First',
                        caption: 'Caption 1',
                        fileName: '5-1.jpg'
                    }
                ]
            }
        ]));

        spyOn(component.captionChanged, 'emit');

        component.photoKey = 5;

        component.ngOnChanges(
        {
            photoKey: new SimpleChange(null, 5, true)
        });

        tick();

        expect(apiSpy.getAllPhotos).toHaveBeenCalled();
        expect(component.errorMessage).toBe('');
        expect(component.isLoading).toBeFalse();
        expect(component.currentIndex).toBe(0);
        expect(component.photos.length).toBe(2);
        expect(component.photos[0].src).toBe('assets/images/cities/5/5-1.jpg');
        expect(component.photos[0].alt).toBe('First');
        expect(component.photos[0].caption).toBe('Caption 1');
        expect(component.captionChanged.emit).toHaveBeenCalledWith('Caption 1');
    }));

    it('should set no photos found error when group is missing', fakeAsync(() =>
    {
        apiSpy.getAllPhotos.and.returnValue(of(
        [
            {
                photoKey: 99,
                photos:
                [
                    {
                        photoIndex: 1,
                        sortOrder: 1,
                        title: 'Other',
                        caption: 'Other caption',
                        fileName: '99-1.jpg'
                    }
                ]
            }
        ]));

        component.photoKey = 5;

        component.ngOnChanges(
        {
            photoKey: new SimpleChange(null, 5, true)
        });

        tick();

        expect(component.photos).toEqual([]);
        expect(component.errorMessage).toBe('No photos found for PhotoKey 5.');
        expect(component.isLoading).toBeFalse();
    }));

    it('should set failure message when api call errors', fakeAsync(() =>
    {
        apiSpy.getAllPhotos.and.returnValue(throwError(() => new Error('boom')));

        component.photoKey = 5;

        component.ngOnChanges(
        {
            photoKey: new SimpleChange(null, 5, true)
        });

        tick();

        expect(component.isLoading).toBeFalse();
        expect(component.errorMessage).toBe('Failed to load photos.');
        expect(debugLoggerSpy.error).toHaveBeenCalled();
    }));

    it('should expand and collapse caption', () =>
    {
        component.isCaptionExpanded = false;
        component.expandCaption();
        expect(component.isCaptionExpanded).toBeTrue();

        component.collapseCaption();
        expect(component.isCaptionExpanded).toBeFalse();
    });

    it('should update currentIndex and emit caption onSlideChange', fakeAsync(() =>
    {
        spyOn(component.captionChanged, 'emit');

        component.photos =
        [
            { src: 'a.jpg', alt: 'A', caption: 'Caption A' },
            { src: 'b.jpg', alt: 'B', caption: 'Caption B' }
        ];
        component.isCaptionExpanded = true;
        component.activeCaptionOverflows = true;

        const evt =
        {
            target:
            {
                swiper:
                {
                    activeIndex: 1
                }
            }
        } as unknown as Event;

        component.onSlideChange(evt);
        tick();

        expect(component.currentIndex).toBe(1);
        expect(component.isCaptionExpanded).toBeFalse();
        expect(component.activeCaptionOverflows).toBeFalse();
        expect(component.captionChanged.emit).toHaveBeenCalledWith('Caption B');
    }));

    it('should update currentIndex from custom swiper event detail', fakeAsync(() =>
    {
        spyOn(component.captionChanged, 'emit');

        component.photos =
        [
            { src: 'a.jpg', alt: 'A', caption: 'Caption A' },
            { src: 'b.jpg', alt: 'B', caption: 'Caption B' }
        ];

        const evt = new CustomEvent('swiperslidechange',
        {
            detail:
            [
                {
                    activeIndex: 1
                }
            ]
        });

        component.onSwiperSlideChange(evt);
        tick();

        expect(component.currentIndex).toBe(1);
        expect(component.captionChanged.emit).toHaveBeenCalledWith('Caption B');
    }));

    it('should fall back to target swiper activeIndex in onSwiperSlideChange', fakeAsync(() =>
    {
        spyOn(component.captionChanged, 'emit');

        component.photos =
        [
            { src: 'a.jpg', alt: 'A', caption: 'Caption A' },
            { src: 'b.jpg', alt: 'B', caption: 'Caption B' }
        ];

        const evt =
        {
            detail: null,
            target:
            {
                swiper:
                {
                    activeIndex: 0
                }
            }
        } as unknown as Event;

        component.onSwiperSlideChange(evt);
        tick();

        expect(component.currentIndex).toBe(0);
        expect(component.captionChanged.emit).toHaveBeenCalledWith('Caption A');
    }));

    it('should initialize swiper in ngAfterViewInit', fakeAsync(() =>
    {
        fixture.detectChanges();
        flushMicrotasks();

        const swiperEl = component['swiperEl'].nativeElement as unknown as MockSwiperContainerElement;

        expect(swiperEl.initialize).toHaveBeenCalled();
        expect(swiperEl.swiper.params.preventClicks).toBeFalse();
        expect(swiperEl.swiper.params.preventClicksPropagation).toBeFalse();
        expect(swiperEl.swiper.params.touchStartPreventDefault).toBeFalse();
        expect(swiperEl.swiper.navigation.init).toHaveBeenCalled();
        expect(swiperEl.swiper.navigation.update).toHaveBeenCalled();
        expect(swiperEl.swiper.pagination.render).toHaveBeenCalled();
        expect(swiperEl.swiper.pagination.update).toHaveBeenCalled();
        expect(swiperEl.swiper.update).toHaveBeenCalled();
    }));

    it('ngOnChanges should return immediately when photoKey is not in changes', () =>
    {
        component.photoKey = 5;

        component.ngOnChanges({});

        expect(apiSpy.getAllPhotos).not.toHaveBeenCalled();
    });

    it('load should sort by sortOrder then by photoIndex and use fallback alt text', fakeAsync(() =>
    {
        apiSpy.getAllPhotos.and.returnValue(of(
        [
            {
                photoKey: 5,
                photos:
                [
                    {
                        photoIndex: 3,
                        sortOrder: 1,
                        title: '',
                        caption: 'Caption 3',
                        fileName: '5-3.jpg'
                    },
                    {
                        photoIndex: 1,
                        sortOrder: 1,
                        title: '',
                        caption: 'Caption 1',
                        fileName: '5-1.jpg'
                    },
                    {
                        photoIndex: 2,
                        sortOrder: 0,
                        title: 'Explicit title',
                        caption: 'Caption 2',
                        fileName: '5-2.jpg'
                    }
                ]
            }
        ]));

        component.photoKey = 5;

        component.ngOnChanges(
        {
            photoKey: new SimpleChange(null, 5, true)
        });

        tick();

        expect(component.photos.length).toBe(3);
        expect(component.photos[0].src).toContain('/5-2.jpg');
        expect(component.photos[1].src).toContain('/5-1.jpg');
        expect(component.photos[2].src).toContain('/5-3.jpg');
        expect(component.photos[1].alt).toBe('Photo 1');
        expect(component.photos[2].alt).toBe('Photo 3');
    }));

    it('onSlideChange should fall back to index 0 when swiper activeIndex is missing', fakeAsync(() =>
    {
        spyOn(component.captionChanged, 'emit');

        component.photos =
        [
            { src: 'a.jpg', alt: 'A', caption: 'Caption A' },
            { src: 'b.jpg', alt: 'B', caption: 'Caption B' }
        ];

        const evt =
        {
            target: {}
        } as unknown as Event;

        component.onSlideChange(evt);
        tick();

        expect(component.currentIndex).toBe(0);
        expect(component.captionChanged.emit).toHaveBeenCalledWith('Caption A');
    }));

    it('recalcCaptionOverflows should set false when caption element is missing', () =>
    {
        component.activeCaptionOverflows = true;

        (component as unknown as { captionEl?: unknown }).captionEl = undefined;

        (component as unknown as { recalcCaptionOverflows(): void }).recalcCaptionOverflows();

        expect(component.activeCaptionOverflows).toBeFalse();
    });

    it('recalcCaptionOverflows should retry with requestAnimationFrame when width is too small', () =>
    {
        const captionEl =
        {
            nativeElement:
            {
                getBoundingClientRect: () => ({ width: 10 })
            }
        };

        (component as unknown as { captionEl: unknown }).captionEl = captionEl as unknown as never;

        const rafSpy = spyOn(window, 'requestAnimationFrame').and.returnValue(1);

        (component as unknown as { recalcCaptionOverflows(): void }).recalcCaptionOverflows();

        expect(component.activeCaptionOverflows).toBeFalse();
        expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('recalcCaptionOverflows should set overflow result and mark for check', () =>
    {
        const captionNativeEl = document.createElement('div');

        spyOn(captionNativeEl, 'getBoundingClientRect').and.returnValue(
            {
                width: 200
            } as DOMRect
        );

        (component as unknown as { captionEl: unknown }).captionEl =
        {
            nativeElement: captionNativeEl
        } as unknown as never;

        const measureSpy = spyOn(
            component as unknown as { measureTwoLineOverflow(el: HTMLElement): boolean },
            'measureTwoLineOverflow'
        ).and.returnValue(true);

        const cdr = (component as unknown as { cdr: { markForCheck(): void } }).cdr;
        const markForCheckSpy = spyOn(cdr, 'markForCheck');

        (component as unknown as { recalcCaptionOverflows(): void }).recalcCaptionOverflows();

        expect(measureSpy).toHaveBeenCalledWith(captionNativeEl);
        expect(component.activeCaptionOverflows).toBeTrue();
        expect(markForCheckSpy).toHaveBeenCalled();
    });

    it('measureTwoLineOverflow should return false for empty text', () =>
    {
        const el = document.createElement('div');
        el.textContent = '   ';

        const result = (component as unknown as { measureTwoLineOverflow(el: HTMLElement): boolean })
            .measureTwoLineOverflow(el);

        expect(result).toBeFalse();
    });

    it('measureTwoLineOverflow should use fontSize fallback when lineHeight is not numeric', () =>
    {
        const el = document.createElement('div');
        el.textContent = 'Some caption text';

        spyOn(el, 'getBoundingClientRect').and.returnValue(
        {
            width: 100,
            height: 20
        } as DOMRect);

        spyOn(window, 'getComputedStyle').and.returnValue(
        {
            lineHeight: 'normal',
            fontSize: '20px',
            font: '400 20px Arial',
            fontFamily: 'Arial',
            fontWeight: '400',
            fontStyle: 'normal',
            letterSpacing: '0px',
            wordBreak: 'normal',
            overflowWrap: 'break-word'
        } as CSSStyleDeclaration);

        const originalCreateElement = document.createElement.bind(document);
        spyOn(document, 'createElement').and.callFake((tagName: string): HTMLElement =>
        {
            const probe = originalCreateElement(tagName);
            if (tagName === 'div')
            {
                spyOn(probe, 'getBoundingClientRect').and.returnValue(
                {
                    width: 100,
                    height: 60
                } as DOMRect);
            }

            return probe;
        });

        const appendSpy = spyOn(document.body, 'appendChild').and.callThrough();
        const removeSpy = spyOn(document.body, 'removeChild').and.callThrough();

        const result = (component as unknown as { measureTwoLineOverflow(el: HTMLElement): boolean })
            .measureTwoLineOverflow(el);

        expect(result).toBeTrue();
        expect(appendSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();
    });

    it('debugLog should call debug logger', () =>
    {
        component.debugLog('hello');

        expect(debugLoggerSpy.log).toHaveBeenCalledWith('hello');
    });

    it('ngOnDestroy should complete destroyed$ and remove resize listener', () =>
    {
        const removeSpy = spyOn(window, 'removeEventListener');

        const destroyed$ = (component as unknown as
        {
            destroyed$: { isStopped?: boolean; closed?: boolean };
        }).destroyed$;

        component.ngOnDestroy();

        expect(removeSpy).toHaveBeenCalled();
        expect(destroyed$.isStopped || destroyed$.closed).toBeTrue();
    });

    it('onResize should schedule recalcCaptionOverflows with requestAnimationFrame', () =>
    {
        const recalcSpy = spyOn(
            component as unknown as { recalcCaptionOverflows(): void },
            'recalcCaptionOverflows'
        );

        let capturedCallback: FrameRequestCallback | undefined;

        const rafSpy = spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) =>
        {
            capturedCallback = callback;
            return 1;
        });

        const onResize = (component as unknown as { onResize: () => void }).onResize;

        onResize();

        expect(rafSpy).toHaveBeenCalledTimes(1);
        expect(recalcSpy).not.toHaveBeenCalled();

        capturedCallback?.(0);

        expect(recalcSpy).toHaveBeenCalledTimes(1);
    });

});