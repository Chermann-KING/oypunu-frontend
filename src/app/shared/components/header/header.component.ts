import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  isAuthenticated = false;
  isHomePage = false;
  isAuthPage = false;
  isDashboardPage = false;
  isMobileMenuOpen = false;

  constructor(private _authService: AuthService, private _router: Router) {}

  ngOnInit(): void {
    this._authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
      this.updateDashboardStatus();
    });

    // Détecter la page courante
    this._router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isHomePage = event.url === '/' || event.url === '/home';
        this.isAuthPage = event.url.startsWith('/auth');
        this.updateDashboardStatus();
        // Fermer le menu mobile lors de la navigation
        this.isMobileMenuOpen = false;
      });

    // Vérifier la route initiale
    this.isHomePage = this._router.url === '/' || this._router.url === '/home';
    this.isAuthPage = this._router.url.startsWith('/auth');
    this.updateDashboardStatus();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  private updateDashboardStatus(): void {
    // Le dashboard s'affiche quand on est sur /home ET connecté
    this.isDashboardPage = this.isHomePage && this.isAuthenticated;
  }
}
