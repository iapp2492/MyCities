import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import
{
    PhotoViewerDialogComponent,
    PhotoViewerDialogData
} from './photo-viewer-dialog.component';
import { DebugLoggerService } from '../core/services/debug-logger.service';

@Component({
    selector: 'app-photo-viewer',
    standalone: true,
    template: ''
})
class MockPhotoViewerComponent
{
    @Input() photoKey!: number;
    @Input() isDialog!: boolean;
    @Output() captionChanged = new EventEmitter<string>();
}

describe('PhotoViewerDialogComponent', () =>
{
    let component: PhotoViewerDialogComponent;
    let fixture: ComponentFixture<PhotoViewerDialogComponent>;

    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<PhotoViewerDialogComponent>>;
    let debugLoggerSpy: jasmine.SpyObj<DebugLoggerService>;

    const dialogData: PhotoViewerDialogData =
    {
        photoKey: 123
    };

    beforeEach(async () =>
    {
        dialogRefSpy = jasmine.createSpyObj<MatDialogRef<PhotoViewerDialogComponent>>(
            'MatDialogRef',
            ['close']
        );

        debugLoggerSpy = jasmine.createSpyObj<DebugLoggerService>(
            'DebugLoggerService',
            ['log', 'warn', 'error']
        );

        await TestBed.configureTestingModule(
        {
            imports: [PhotoViewerDialogComponent],
            providers:
            [
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: DebugLoggerService, useValue: debugLoggerSpy },
            ]
        })
        .overrideComponent(PhotoViewerDialogComponent,
        {
            set:
            {
                imports:
                [
                    MockPhotoViewerComponent
                ]
            }
        })
        .compileComponents();

        fixture = TestBed.createComponent(PhotoViewerDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () =>
    {
        expect(component).toBeTruthy();
    });

    it('should expose injected dialog data', () =>
    {
        expect(component.data).toEqual(dialogData);
    });

    it('should log dialog data on init', () =>
    {
        expect(debugLoggerSpy.log).toHaveBeenCalledWith('Dialog data:', dialogData);
    });

    it('should initialize captionText to empty string', () =>
    {
        expect(component.captionText).toBe('');
    });

    it('should update captionText when onCaptionChanged is called with text', () =>
    {
        component.onCaptionChanged('Hello');

        expect(component.captionText).toBe('Hello');
    });

    it('should update captionText to empty string when onCaptionChanged is called with empty string', () =>
    {
        component.captionText = 'Old caption';

        component.onCaptionChanged('');

        expect(component.captionText).toBe('');
    });

    it('should close the dialog when close() is called', () =>
    {
        component.close();

        expect(dialogRefSpy.close).toHaveBeenCalled();
    });
});