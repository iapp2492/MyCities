import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PhotoViewerDialogComponent, PhotoViewerDialogData } from './photo-viewer-dialog.component';

export type PhotoViewerPresentation = 'responsive' | 'google';

@Injectable({ providedIn: 'root' })
export class PhotoViewerLauncherService
{
    private readonly dialog = inject(MatDialog);

    public open(photoKey: number, presentation: PhotoViewerPresentation = 'responsive'): void
    {
        if (!Number.isFinite(photoKey) || photoKey <= 0)
        {
            return;
        }

        // Preserve Google's existing dimensions and Material defaults until reviewed.
        const options: MatDialogConfig<PhotoViewerDialogData> = presentation === 'google'
            ? {
                maxWidth: '95vw',
                width: '1200px',
                height: '90vh'
            }
            : {
                autoFocus: false,
                restoreFocus: false,
                closeOnNavigation: true,
                hasBackdrop: true,
                width: 'min(1100px, 92vw)',
                height: 'min(780px, 88vh)',
                maxWidth: '92vw',
                maxHeight: '88vh'
            };

        this.dialog.open(PhotoViewerDialogComponent,
        {
            ...options,
            data: { photoKey },
            panelClass: 'photo-viewer-dialog'
        });
    }
}
