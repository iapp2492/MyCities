import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MyCitiesApiService } from '../core/services/my-cities-api.service';
import { MyCityPhotosResponseDto } from '../../models/MyCityPhotosResponseDto';
import { Output, EventEmitter } from '@angular/core';
import { ElementRef } from '@angular/core';

export interface PhotoVm
{
    src: string;
    alt: string;
    caption: string;
}

interface SwiperContainerElement extends HTMLElement
{
    initialize: () => void;
    swiper?: 
    {
        params:
        {
            preventClicks?: boolean;
            preventClicksPropagation?: boolean;
            touchStartPreventDefault?: boolean;
            noSwiping?: boolean;
            noSwipingClass?: string;
        };
        update: () => void;
        navigation?: { init: () => void; update: () => void };
        pagination?: { render: () => void; update: () => void };
    };
}

@Component({
    selector: 'app-photo-viewer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './photo-viewer.component.html',
    styleUrl: './photo-viewer.component.scss',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PhotoViewerComponent implements OnChanges, OnDestroy, AfterViewInit
{
    @Input() public photoKey: number | null = null;
    @Input() public isDialog = false;
    @Output() public captionChanged: EventEmitter<string> = new EventEmitter<string>();

    @ViewChild('swiperEl')
    private swiperEl!: ElementRef<HTMLElement>;

    @ViewChild('captionEl')
    private captionEl!: ElementRef<HTMLElement>;

    public isCaptionExpanded = false;
    public activeCaptionOverflows = false;

    public readonly title: string = 'Photo Viewer';

    public photos: PhotoVm[] = [];
    public isLoading = false;
    public errorMessage = '';
    public currentIndex = 0;

    private readonly destroyed$: Subject<void> = new Subject<void>();
    private readonly api = inject(MyCitiesApiService);

    private readonly cdr = inject(ChangeDetectorRef);

    public constructor()
    {
        console.log('PhotoViewerComponent constructed');
    }

    public ngAfterViewInit(): void
    {
        const el: SwiperContainerElement = this.swiperEl.nativeElement as SwiperContainerElement;

        Object.assign(el, this.swiperConfig);

        el.initialize();

        queueMicrotask(() =>
        {
            // CRITICAL: force these AFTER initialization
            if (el.swiper)
            {
                el.swiper.params.preventClicks = false;
                el.swiper.params.preventClicksPropagation = false;
                el.swiper.params.touchStartPreventDefault = false;
            }

            el.swiper?.navigation?.init();
            el.swiper?.navigation?.update();
            el.swiper?.pagination?.render();
            el.swiper?.pagination?.update();
            el.swiper?.update();
        });    

        // Optional: recalc on resize
    //    window.addEventListener('resize', this.onResize);
    }

    public swiperConfig: Record<string, unknown> =
    {
        slidesPerView: 1,
        spaceBetween: 12,
        centeredSlides: true,
        navigation: true,
        pagination: { clickable: true },
        keyboard: { enabled: true },
        grabCursor: true,
        loop: false,
        simulateTouch: true,

        // Critical for buttons inside slides
        preventClicks: false,
        preventClicksPropagation: false,
        touchStartPreventDefault: false,

        noSwiping: true,
        noSwipingClass: 'swiper-no-swiping'
    };

    public ngOnChanges(changes: SimpleChanges): void
    {
        if (!changes['photoKey'])
        {
            return;
        }

        const key = Number(this.photoKey);

        console.log('PhotoViewerComponent.ngOnChanges photoKey =', this.photoKey, 'parsed =', key);

        if (!Number.isFinite(key) || key <= 0)
        {
            this.photos = [];
            this.errorMessage = 'Invalid photo key.';
            return;
        }

        this.load(key);
    }

    private load(photoKey: number): void
    {
        this.isLoading = true;
        this.errorMessage = '';
        this.photos = [];

        console.log(`PhotoViewerComponent.load(${photoKey}) calling api...`);

        this.api.getAllPhotos()
            .pipe(takeUntil(this.destroyed$))
            .subscribe({
                next: (groups: MyCityPhotosResponseDto[]) =>
                {
                    console.log('getAllPhotos returned groups:', groups);

                    const group = groups.find(g => g.photoKey === photoKey);

                    console.log('matched group:', group);

                    if (!group || group.photos.length === 0)
                    {
                        this.photos = [];
                        this.errorMessage = `No photos found for PhotoKey ${photoKey}.`;
                        this.isLoading = false;
                        return;
                    }

                    this.photos = group.photos
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder || a.photoIndex - b.photoIndex)
                        .map((p) =>
                        {
                            const src = this.buildCityPhotoUrl(photoKey, p.fileName);

                            return {
                                src,
                                alt: p.title || `Photo ${p.photoIndex}`,
                                caption: p.caption
                            };
                        });

                    console.log('final photos VM:', this.photos);
                    this.currentIndex = 0;
                    this.captionChanged.emit(this.photos[0]?.caption ?? '');

                    setTimeout(() =>
                    {
                        this.recalcCaptionOverflows();
                    }, 0);

                    this.isLoading = false;
                },
                error: (err: unknown) =>
                {
                    console.error('getAllPhotos error:', err);
                    this.isLoading = false;
                    this.errorMessage = 'Failed to load photos.';
                }
            });
    }

    public expandCaption(): void
    {
        this.isCaptionExpanded = true;
    }

    public collapseCaption(): void
    {
        this.isCaptionExpanded = false;
    }

    private buildCityPhotoUrl(photoKey: number, fileNameFromDb: string): string
    {
        // Your actual file structure: assets/images/cities/{photoKey}/{photoKey}-{photoIndex}.jpg
        const folder = `assets/images/cities/${photoKey}`;
        const url = `${folder}/${fileNameFromDb}`;
        console.log(`Building photo URL for photoKey=${photoKey}, fileNameFromDb="${fileNameFromDb}": ${url}`); 
        return url;
    }

    public onSlideChange(evt: Event): void
    {
        // Web component event: evt.target is the swiper-container element
        const el = evt.target as unknown as { swiper?: { activeIndex: number } };
        const idx = el?.swiper?.activeIndex ?? 0;

        this.currentIndex = idx;
        this.isCaptionExpanded = false;
        this.activeCaptionOverflows = false;
        this.captionChanged.emit(this.photos[idx]?.caption ?? '');

        setTimeout(() =>
        {
            this.recalcCaptionOverflows();
        }, 0);
    }

    public onSwiperSlideChange(evt: Event): void
    {
        const idx = this.tryGetActiveIndexFromSwiperEvent(evt);

        this.currentIndex = idx;
        this.isCaptionExpanded = false;
        this.activeCaptionOverflows = false;
        this.captionChanged.emit(this.photos[idx]?.caption ?? '');

        setTimeout(() =>
        {
            this.recalcCaptionOverflows();
        }, 0);
    }

    private tryGetActiveIndexFromSwiperEvent(evt: Event): number
    {
        const custom = evt as CustomEvent<unknown>;
        const detail = custom.detail;

        if (Array.isArray(detail) && detail.length > 0)
        {
            const swiper = detail[0] as { activeIndex?: number } | null;
            if (swiper && typeof swiper.activeIndex === 'number')
            {
                return swiper.activeIndex;
            }
        }

        // Fallback to your old approach
        const target = evt.target as { swiper?: { activeIndex?: number } } | null;
        const idx = target?.swiper?.activeIndex;

        return typeof idx === 'number' ? idx : 0;
    }   

    private recalcCaptionOverflows(): void
    {
        const el = this.captionEl?.nativeElement;

        if (!el)
        {
            this.activeCaptionOverflows = false;
            return;
        }

        const width = el.getBoundingClientRect().width;

        // If we measure before layout settles, width can be tiny/0 and we get bad results.
        if (width < 20)
        {
            requestAnimationFrame(() =>
            {
                this.recalcCaptionOverflows();
            });

            return;
        }

        this.activeCaptionOverflows = this.measureTwoLineOverflow(el);
        this.cdr.markForCheck();
    }

    private measureTwoLineOverflow(el: HTMLElement): boolean
    {
        const text = (el.textContent ?? '').trim();

        if (text.length === 0)
        {
            return false;
        }

        const computed = window.getComputedStyle(el);

        // Compute an actual pixel line-height
        let lineHeightPx = Number.parseFloat(computed.lineHeight);

        if (!Number.isFinite(lineHeightPx))
        {
            const fontSizePx = Number.parseFloat(computed.fontSize);
            lineHeightPx = Number.isFinite(fontSizePx) ? fontSizePx * 1.35 : 18;
        }

        const maxTwoLines = (lineHeightPx * 2) + 1;

        const rect = el.getBoundingClientRect();
        const width = rect.width;

        const probe = document.createElement('div');

        // Copy key typography + wrapping behavior
        probe.style.position = 'fixed';
        probe.style.visibility = 'hidden';
        probe.style.pointerEvents = 'none';
        probe.style.left = '-10000px';
        probe.style.top = '0';
        probe.style.width = `${width}px`;

        probe.style.font = computed.font;
        probe.style.fontFamily = computed.fontFamily;
        probe.style.fontSize = computed.fontSize;
        probe.style.fontWeight = computed.fontWeight;
        probe.style.fontStyle = computed.fontStyle;
        probe.style.letterSpacing = computed.letterSpacing;
        probe.style.lineHeight = computed.lineHeight;
        probe.style.whiteSpace = 'normal';
        probe.style.wordBreak = computed.wordBreak;
        probe.style.overflowWrap = computed.overflowWrap;

        probe.textContent = text;

        document.body.appendChild(probe);

        const fullHeight = probe.getBoundingClientRect().height;

        document.body.removeChild(probe);

        return fullHeight > maxTwoLines;
    }

    private readonly onResize = (): void =>
    {
        requestAnimationFrame(() =>
        {
            this.recalcCaptionOverflows();
        });
    };

    public debugLog(message: string): void
    {
        // Keep this for now; remove later when done debugging.
         
        console.log(message);
    }
        
    public ngOnDestroy(): void
    {
        window.removeEventListener('resize', this.onResize);
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}