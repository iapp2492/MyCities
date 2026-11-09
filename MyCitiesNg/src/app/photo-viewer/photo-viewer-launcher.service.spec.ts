import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { PhotoViewerLauncherService } from './photo-viewer-launcher.service';
import { PhotoViewerDialogComponent } from './photo-viewer-dialog.component';

describe('PhotoViewerLauncherService', () =>
{
    let service: PhotoViewerLauncherService;
    let dialog: jasmine.SpyObj<MatDialog>;

    beforeEach(() =>
    {
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        TestBed.configureTestingModule(
        {
            providers: [{ provide: MatDialog, useValue: dialog }]
        });
        service = TestBed.inject(PhotoViewerLauncherService);
    });

    it('opens Leaflet and Mapbox photos with their existing responsive configuration', () =>
    {
        service.open(123);

        expect(dialog.open).toHaveBeenCalledWith(PhotoViewerDialogComponent,
        {
            autoFocus: false,
            restoreFocus: false,
            closeOnNavigation: true,
            hasBackdrop: true,
            width: 'min(1100px, 92vw)',
            height: 'min(780px, 88vh)',
            maxWidth: '92vw',
            maxHeight: '88vh',
            data: { photoKey: 123 },
            panelClass: 'photo-viewer-dialog'
        });
    });

    it('preserves Google dimensions and leaves its other Material options at their defaults', () =>
    {
        service.open(123, 'google');

        expect(dialog.open).toHaveBeenCalledWith(PhotoViewerDialogComponent,
        {
            maxWidth: '95vw',
            width: '1200px',
            height: '90vh',
            data: { photoKey: 123 },
            panelClass: 'photo-viewer-dialog'
        });
    });

    it('does not open a dialog for invalid photo keys', () =>
    {
        for (const key of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
        {
            service.open(key);
        }

        expect(dialog.open).not.toHaveBeenCalled();
    });
});
