import { NgClass } from "@angular/common";
import { Component, Input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";

@Component({
    selector: 'app-ktr-button',
    template: `
    <button
      mat-raised-button
      color="primary"  
      [ngClass]="buttonClass"  
      [attr.type]="type"
      [disabled]="disabled">
      <ng-content></ng-content>
    </button>
  `,
    styleUrls: ['./ktr-button.component.scss'],
    standalone: true,
    imports: [MatButtonModule, NgClass],
})
export class KtrButtonComponent 
{
    // default to "button" so it won't submit forms accidentally
    @Input() type: 'button' | 'submit' | 'reset' = 'button';

    @Input() disabled = false;

    @Input() buttonClass: string | string[] | Set<string> | Record<string, unknown> = '';

}
