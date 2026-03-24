import { Injectable } from '@angular/core';
import { MonoTypeOperatorFunction, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DebugLoggerService
{
    private get isEnabled(): boolean
    {
        return environment.enableDebugLogging;
    }

    public log(message: string, data?: unknown): void
    {
        if (!this.isEnabled)
        {
            return;
        }

        if (data === undefined)
        {
            console.log(message);
            return;
        }

        console.log(message, data);
    }

    public warn(message: string, data?: unknown): void
    {
        if (!this.isEnabled)
        {
            return;
        }

        if (data === undefined)
        {
            console.warn(message);
            return;
        }

        console.warn(message, data);
    }

    public error(message: string, data?: unknown): void
    {
        if (!this.isEnabled)
        {
            return;
        }

        if (data === undefined)
        {
            console.error(message);
            return;
        }

        console.error(message, data);
    }

    public debugTap<T>(label: string, format?: (value: T) => unknown): MonoTypeOperatorFunction<T>
    {
        return tap((value: T) =>
        {
            if (!this.isEnabled)
            {
                return;
            }

            console.log(label, format ? format(value) : value);
        });
    }
}