import {
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenRefreshManagerService } from '../services/token-refresh-manager.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const tokenRefreshManager = inject(TokenRefreshManagerService);

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
          handleLogout(authService, router, tokenRefreshManager);
          return throwError(() => error);
        }

        // Vérifier si on a un refresh token
        if (authService.hasValidRefreshToken()) {
          console.log('[AuthInterceptor] 🔄 Tentative de refresh du token');
          return handleTokenRefresh(authService, router, tokenRefreshManager, req, next);
        } else {
          console.warn('[AuthInterceptor] 🚪 Pas de refresh token, déconnexion');
          handleLogout(authService, router, tokenRefreshManager);
          return throwError(() => error);
        }
      }

      return throwError(() => error);
    })
  );
};

/**
 * Gère le processus de refresh des tokens
 * PHASE 2-2: Version améliorée sans variables globales et avec gestion des timeouts
 */
function handleTokenRefresh(
  authService: AuthService,
  router: Router,
  tokenRefreshManager: TokenRefreshManagerService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<any> {
  
  if (!tokenRefreshManager.isCurrentlyRefreshing()) {
    // Démarrer un nouveau refresh
    console.log('[AuthInterceptor] 🔄 Démarrage du processus de refresh');
    
    return tokenRefreshManager.refreshTokens(() => authService.refreshTokens()).pipe(
      switchMap((response: any) => {
        const newToken = response.tokens.access_token;
        
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
        console.error('[AuthInterceptor] ❌ Échec du refresh, déconnexion');
        handleLogout(authService, router, tokenRefreshManager);
        return throwError(() => error);
      })
    );
  } else {
    // Un refresh est déjà en cours, attendre qu'il se termine
    console.log('[AuthInterceptor] ⏳ Refresh en cours, mise en attente de la requête');
    
    return tokenRefreshManager.getNewTokenWhenAvailable().pipe(
      switchMap((newToken: string) => {
        console.log('[AuthInterceptor] 🔄 Refresh terminé, relance de la requête en attente');
        
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        
        return next(authReq);
      }),
      catchError((error) => {
        console.error('[AuthInterceptor] ❌ Timeout ou erreur lors de l\'attente du refresh');
        handleLogout(authService, router, tokenRefreshManager);
        return throwError(() => error);
      })
    );
  }
}

/**
 * Centralise la logique de déconnexion avec cleanup
 * PHASE 2-2: Évite la duplication de code et garantit le cleanup
 */
function handleLogout(
  authService: AuthService,
  router: Router,
  tokenRefreshManager: TokenRefreshManagerService
): void {
  console.log('[AuthInterceptor] 🚪 Déconnexion avec cleanup');
  
  // Force reset du state du refresh pour éviter les blocages
  tokenRefreshManager.forceReset();
  
  // Déconnexion et redirection
  authService.logout();
  router.navigate(['/auth/login']);
}
