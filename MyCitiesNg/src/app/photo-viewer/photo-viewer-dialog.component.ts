import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { PhotoViewerComponent } from './photo-viewer.component';

export interface PhotoViewerDialogData
{
    photoKey: number;
}

@Component({
    selector: 'app-photo-viewer-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, PhotoViewerComponent],
   template: `
    <div class="dialog-root">
        <div class="topbar">

            <div class="spacer"></div>

            <button
                type="button"
                class="close"
                aria-label="Close"
                (click)="close()"
            >
                ✕
            </button>
        </div>

        <div class="stage">
            <app-photo-viewer
                [photoKey]="data.photoKey"
                [isDialog]="true"
                (captionChanged)="onCaptionChanged($event)"
            />
        </div>
    </div>
    `,
    styles: [`
        .dialog-root
        {
            display: grid;
            grid-template-rows: auto 1fr;
            height: 100%;
            background: #000; /* optional: black backdrop inside dialog */
            border-radius: 12px;
            overflow: hidden;
        }

        .topbar
        {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 4px 8px;   
            background:  #000;
            color: #fff;
            border-bottom: none;
        }

        .caption
        {
            min-width: 0;
            font-size: 14px;
            line-height: 1.35;

            /* clamp to 2 lines */
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
        }

        .spacer
        {
            flex: 1 1 auto;
        }

        .close
        {
            border: 0;
            background: transparent;
            color: #fff;
            font-size: 22px;
            line-height: 1;
            cursor: pointer;
            padding: 6px 8px;
        }

        .stage
        {
            padding: 12px 28px 20px 28px; /* wider side margins */
            overflow: hidden;
            display: flex;
        }

        /* Remove Material surface background & divider look */
        .photo-viewer-dialog .mat-mdc-dialog-container
        {
            padding: 0;
            background: transparent;
        }

        .photo-viewer-dialog .mdc-dialog__surface
        {
            background: #000;
            box-shadow: none;
            border: none;
        }

        .photo-viewer-dialog .mdc-dialog__surface
        {
            padding: 0 !important;
            border-radius: 16px;
        }

    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PhotoViewerDialogComponent implements OnInit
{
    private readonly dialogRef = inject(MatDialogRef<PhotoViewerDialogComponent>);
    public readonly  data = inject(MAT_DIALOG_DATA) as PhotoViewerDialogData; 


    public captionText = '';

    public onCaptionChanged(caption: string): void
    {
        this.captionText = caption ?? '';
    }
    
    ngOnInit(): void
    {
        console.log('Dialog data:', this.data);
    }

    public close(): void
    {
        this.dialogRef.close();
    }
}