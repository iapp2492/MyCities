import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AnalyticsService } from './core/services/analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit
{
    protected readonly title = signal('MyCitiesNg');

    private readonly router = inject(Router);
    private readonly analyticsService = inject(AnalyticsService);

    ngOnInit(): void
    {
        this.analyticsService.pageView(
            window.location.pathname + window.location.search,
            document.title
        );

        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() =>
            {
                this.analyticsService.pageView(
                    window.location.pathname + window.location.search,
                    document.title
                );
            });
    }
}
