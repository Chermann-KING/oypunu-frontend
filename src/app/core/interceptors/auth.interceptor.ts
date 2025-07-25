import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, filter, take } from 'rxjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Variables globales pour gérer l'état du refresh
let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Routes qui ne nécessitent pas d'authentification
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));

  const token = authService.getToken();

  console.log('[AuthInterceptor] 🔍 Requête:', req.url);
  console.log('[AuthInterceptor] 🔐 Token présent:', !!token);
  console.log('[AuthInterceptor] 🌐 Route publique:', isPublicRoute);

  // Ajouter le token si disponible et ce n'est pas une route publique
  if (token && !isPublicRoute) {
    console.log('[AuthInterceptor] ✅ Ajout du token Bearer à la requête');
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('[AuthInterceptor] ❌ Erreur HTTP:', error.status, req.url);

      // Gestion des erreurs 401 (Unauthorized)
      if (error.status === 401 && !isPublicRoute) {
        console.warn('[AuthInterceptor] 🚨 Erreur 401 détectée pour:', req.url);
        
        // Si c'est déjà une requête de refresh qui échoue, déconnecter
        if (req.url.includes('/auth/refresh')) {
          console.error('[AuthInterceptor] 💀 Refresh token invalide, déconnexion');
          authService.logout();
          return throwError(() => error);
        }

        // Vérifier si on a un refresh token
        if (authService.hasValidRefreshToken()) {
          console.log('[AuthInterceptor] 🔄 Tentative de refresh du token');
          return handleTokenRefresh(authService, req, next);
        } else {
          console.warn('[AuthInterceptor] 🚪 Pas de refresh token, déconnexion');
          authService.logout();
          router.navigate(['/auth/login']);
          return throwError(() => error);
        }
      }

      return throwError(() => error);
    })
  );
};

/**
 * Gère le processus de refresh des tokens
 */
function handleTokenRefresh(
  authService: AuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<any> {
  
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    console.log('[AuthInterceptor] 🔄 Démarrage du processus de refresh');

    return authService.refreshTokens().pipe(
      switchMap((response) => {
        isRefreshing = false;
        const newToken = response.tokens.access_token;
        refreshTokenSubject.next(newToken);
        
        console.log('[AuthInterceptor] ✅ Tokens rafraîchis, relance de la requête');
        
        // Relancer la requête originale avec le nouveau token
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        
        return next(authReq);
      }),
      catchError((error) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        
        console.error('[AuthInterceptor] ❌ Échec du refresh, déconnexion');
        authService.logout();
        
        return throwError(() => error);
      })
    );
  } else {
    // Un refresh est déjà en cours, attendre qu'il se termine
    console.log('[AuthInterceptor] ⏳ Refresh en cours, mise en attente de la requête');
    
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        console.log('[AuthInterceptor] 🔄 Refresh terminé, relance de la requête en attente');
        
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        return next(authReq);
      })
    );
  }
}
