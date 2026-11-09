import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Input } from '@angular/core';
import { DebugLoggerService } from '../core/services/debug-logger.service';
import
{
    PhotoViewerDialogComponent,
    PhotoViewerDialogData
} from './photo-viewer-dialog.component';

@Component({
    selector: 'app-photo-viewer',
    standalone: true,
    template: ''
})
class MockPhotoViewerComponent
{
    @Input() photoKey!: number;
    @Input() isDialog!: boolean;
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

        debugLoggerSpy = jasmine.createSpyObj<DebugLoggerService>('DebugLoggerService', ['log', 'warn', 'error']);

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

    it('should close the dialog when close() is called', () =>
    {
        component.close();

        expect(dialogRefSpy.close).toHaveBeenCalled();
    });
});
