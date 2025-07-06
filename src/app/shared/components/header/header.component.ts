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

  constructor(
    private _authService: AuthService,
    private _router: Router
  ) {}

  ngOnInit(): void {
    this._authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
    });

    // Détecter si on est sur la page d'accueil
    this._router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isHomePage = event.url === '/' || event.url === '/home';
      });

    // Vérifier la route initiale
    this.isHomePage = this._router.url === '/' || this._router.url === '/home';
  }
}
