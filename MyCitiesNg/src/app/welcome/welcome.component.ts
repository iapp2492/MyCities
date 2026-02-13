import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { KtrButtonComponent } from '../shared/components/ktr-button.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, KtrButtonComponent],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent 
{
    private router = inject(Router);
    
    goToLeaflet() 
    {
        this.router.navigate(['/map/leaflet']);
    }

    goToMapbox() 
    {
        this.router.navigate(['/map/mapbox']);
    }

    goToGoogle() 
    {
        this.router.navigate(['/map/google']);
    }
}