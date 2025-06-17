import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  isAuthenticated = false;

  constructor(private _authService: AuthService) {}

  ngOnInit(): void {
    this._authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
    });
  }
}
