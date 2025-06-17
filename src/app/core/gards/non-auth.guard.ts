import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class NonAuthGuard {
  constructor(private _authService: AuthService, private _router: Router) {}

  canActivate():
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    if (!this._authService.isAuthenticated()) {
      return true; // L'utilisateur n'est pas connecté, il peut accéder à la route
    }

    console.log('NonAuthGuard: user is already authenticated');
    // Rediriger vers la page d'accueil si l'utilisateur est déjà connecté
    return this._router.createUrlTree(['/']);
  }
}
