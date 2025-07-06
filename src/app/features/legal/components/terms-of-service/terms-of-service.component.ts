import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-terms-of-service',
  standalone: false,
  templateUrl: './terms-of-service.component.html',
  styleUrls: ['./terms-of-service.component.scss']
})
export class TermsOfServiceComponent {
  lastUpdated = '7 janvier 2025';
  version = 'v1.0';

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}