import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PhotoViewerDialogComponent } from './photo-viewer-dialog.component';

@Injectable({ providedIn: 'root' })
export class PhotoViewerLauncherService
{
private readonly dialog = inject(MatDialog);

    public open(photoKey: number): void
    {
        if (!Number.isFinite(photoKey) || photoKey <= 0)
        {
            return;
        }

        this.dialog.open(PhotoViewerDialogComponent,
        {
            data: { photoKey },
            autoFocus: false,
            restoreFocus: false,
            hasBackdrop: true,

            width: 'min(1100px, 92vw)',
            height: 'min(780px, 88vh)',
            maxWidth: '92vw',
            maxHeight: '88vh',

            panelClass: 'photo-viewer-dialog'
        });
    }
}