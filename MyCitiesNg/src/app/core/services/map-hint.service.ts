import { inject, Injectable} from '@angular/core';
import { DebugLoggerService } from './debug-logger.service';

export type MapEngine = 'mapbox' | 'leaflet' | 'google';

export interface MapHintPresenter
{
    showHint(message: string): void;
}

@Injectable({ providedIn: 'root' })
export class MapHintService
{    
    private readonly debugLogger = inject(DebugLoggerService);

    private readonly storagePrefix = 'mycities.mapHint';
    private readonly currentVersion = 1;

    private readonly cooldownMs = 24 * 60 * 60 * 1000 * 7; // 7 days in milliseconds

    public showOnceIfNeeded(engine: MapEngine, presenter: MapHintPresenter): void
    {
        if (!this.shouldShow(engine))
        {
            return;
        }

        presenter.showHint('Tip: Tap a marker to see city details.');

        this.markShown(engine);
    }

    public shouldShow(engine: MapEngine): boolean
    {
        try 
        {
            const versionKey = this.getKey(engine, 'version');
            const lastShownKey = this.getKey(engine, 'lastShownUtc');

            const storedVersion = this.getNumber(versionKey);            
            if (storedVersion !== this.currentVersion)
            {
                // In the case of a new version of this app = treat as not shown (per engine)
                return true;
            }

            const lastShownUtc = this.getNumber(lastShownKey);

            if (lastShownUtc === null)
            {
                return true;
            }

            const ageMs = Date.now() - lastShownUtc;

            // If the user saw the hint within the cooldown period (e.g. last 7 days) (per map engine), don’t show it again; 
            // This way we avoid showing the hint repeatedly to users who have dismissed it.
            return ageMs >= this.cooldownMs;        
            
        } 
        catch (error)
        {
            // In case of any error (e.g. localStorage access issues), default to showing the hint but avoid throwing.
            // Better to show repeatedly than never show
            this.debugLogger.error('Error checking shouldShow in map hint service:', error);
            return true;
        }
    }

    // Mark the hint as shown for the given engine by storing the current version and timestamp in localStorage.
    public markShown(engine: MapEngine): void
    {
        try
        {
            const versionKey = this.getKey(engine, 'version');
            const lastShownKey = this.getKey(engine, 'lastShownUtc');

            localStorage.setItem(versionKey, String(this.currentVersion));
            localStorage.setItem(lastShownKey, String(Date.now()));
        }
        catch (error)        
        {
            // In case of any error (e.g. localStorage access issues), log the error but avoid throwing.
            this.debugLogger.error('Error marking hint as shown in map hint service:', error);
        }
    }

    private getKey(engine: MapEngine, suffix: string): string
    {
        return `${this.storagePrefix}.${engine}.${suffix}`;
    }

    private getNumber(key: string): number | null
    {
        const value = localStorage.getItem(key);

        if (!value)
        {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : null;
       
    }    
}