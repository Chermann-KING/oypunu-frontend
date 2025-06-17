import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  console.log('[AuthInterceptor] Requête:', req.url);
  console.log('[AuthInterceptor] Token présent:', !!token);

  if (token) {
    console.log('[AuthInterceptor] Ajout du token Bearer à la requête');
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(authReq).pipe(
      catchError((error) => {
        console.error('[AuthInterceptor] Erreur HTTP:', error);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.warn('[AuthInterceptor] Erreur 401 détectée pour:', req.url);
          // Vérifier si l'erreur vient d'une API qui n'est pas liée à des favoris
          if (!req.url.includes('/favorite-words/')) {
            console.log('[AuthInterceptor] Déconnexion forcée');
            authService.logout();
            router.navigate(['/']);
          } else {
            // Pour les favoris, évitez la déconnexion complète
            console.warn(
              "Erreur d'authentification lors de l'ajout aux favoris"
            );
          }
        }
        return throwError(() => error);
      })
    );
  } else {
    console.log('[AuthInterceptor] Aucun token, requête sans authentification');
  }

  return next(req);
};
