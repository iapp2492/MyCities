import { Injectable } from '@angular/core';
import { MyCityDto } from '../../../models/myCityDto';

@Injectable({ providedIn: 'root' })
export class CityPopupHtmlService
{
    public build(city: MyCityDto, hasPhotos: boolean): string
    {
        const notes = city.notes?.trim();
        const hasNotes = Boolean(notes);

        const stayDuration = city.stayDuration?.trim();
        const hasStayDuration = Boolean(stayDuration);

        const decades = city.decades?.trim();
        const hasDecades = Boolean(decades);

        return `
            <div style="font-size: 13px; line-height: 1.35;">
                <div style="font-weight: 700; margin-bottom: 6px;">
                    ${this.escapeHtml(city.city)}
                </div>

                <div><b>Country:</b> ${this.escapeHtml(city.country)}</div>
                ${hasStayDuration ? `<div><b>Stay:</b> ${this.escapeHtml(stayDuration)}</div>` : ''}
                ${hasDecades ? `<div><b>Decades:</b> ${this.escapeHtml(decades)}</div>` : ''}

                ${hasNotes ? `
                    <div style="margin-top: 8px;">
                        <div style="font-weight: 600; margin-bottom: 4px;">Notes:</div>
                        <div style="white-space: pre-wrap; text-align: left; overflow-wrap: break-word;">${this.escapeHtml(notes)}</div>
                    </div>
                ` : ''}

                ${hasPhotos ? `
                    <div style="margin-top: 8px;">
                        <a href="#"
                        class="js-view-photos"
                        data-photo-key="${city.photoKey}"
                        style="text-decoration: underline; font-weight: 600;">
                        View photos
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private escapeHtml(value: unknown): string
    {
        const s = String(value ?? '');
        return s
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}