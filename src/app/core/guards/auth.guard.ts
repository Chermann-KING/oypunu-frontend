import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private _authService: AuthService, private _router: Router) {}

  canActivate():
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    console.log("AuthGuard: vérification de l'authentification");
    const isAuthenticated = this._authService.isAuthenticated();
    console.log('AuthGuard: isAuthenticated =', isAuthenticated);

    if (isAuthenticated) {
      console.log('AuthGuard: utilisateur authentifié, accès autorisé');
      return true;
    }

    console.log(
      'AuthGuard: utilisateur non authentifié, redirection vers login'
    );
    return this._router.createUrlTree(['/auth/login']);
  }
}
