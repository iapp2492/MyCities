import { Injectable } from '@angular/core';

declare global
{
    interface Window
    {
        gtag?: (...args: unknown[]) => void;
    }
}

@Injectable(
{
    providedIn: 'root'
})
export class AnalyticsService
{
    event(action: string, params?: Record<string, unknown>): void
    {
        if (window.gtag)
        {
            window.gtag('event', action, params ?? {});
        }
    }

    pageView(pagePath: string, pageTitle?: string): void
    {
        if (window.gtag)
        {
            window.gtag('config', 'G-Y7N92J73K3',
            {
                page_path: pagePath,
                page_title: pageTitle
            });
        }
    }
}