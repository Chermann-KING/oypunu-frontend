import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, timer, of } from 'rxjs';
import { switchMap, catchError, timeout, finalize, filter, take } from 'rxjs/operators';

/**
 * Service pour gérer l'état du refresh des tokens de manière thread-safe
 * PHASE 2-2: Remplacement des variables globales de l'interceptor auth
 */
@Injectable({
  providedIn: 'root'
})
export class TokenRefreshManagerService {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  
  // Configuration des timeouts
  private readonly REFRESH_TIMEOUT_MS = 10000; // 10 secondes
  private readonly CLEANUP_DELAY_MS = 1000; // 1 seconde pour cleanup

  constructor() {}

  /**
   * Vérifie si un refresh est actuellement en cours
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Démarre un processus de refresh des tokens
   */
  refreshTokens<T>(refreshOperation: () => Observable<T>): Observable<T> {
    if (!this.isRefreshing) {
      console.log('[TokenRefreshManager] 🔄 Démarrage du processus de refresh');
      
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return refreshOperation().pipe(
        timeout(this.REFRESH_TIMEOUT_MS),
        switchMap((response: any) => {
          const newToken = response.tokens?.access_token;
          
          if (!newToken) {
            throw new Error('Token manquant dans la réponse de refresh');
          }

          console.log('[TokenRefreshManager] ✅ Tokens rafraîchis avec succès');
          this.refreshTokenSubject.next(newToken);
          
          return of(response);
        }),
        catchError((error) => {
          console.error('[TokenRefreshManager] ❌ Échec du refresh:', error);
          this.refreshTokenSubject.next(null);
          return throwError(() => error);
        }),
        finalize(() => {
          // Cleanup avec délai pour permettre aux requêtes en attente de s'exécuter
          timer(this.CLEANUP_DELAY_MS).subscribe(() => {
            console.log('[TokenRefreshManager] 🧹 Cleanup état refresh');
            this.resetRefreshState();
          });
        })
      );
    } else {
      console.log('[TokenRefreshManager] ⏳ Refresh déjà en cours, mise en attente');
      
      // Retourner l'observable existant pour éviter les requêtes multiples
      return this.waitForRefreshCompletion();
    }
  }

  /**
   * Attend que le refresh en cours se termine et retourne le nouveau token
   */
  private waitForRefreshCompletion<T>(): Observable<T> {
    return this.refreshTokenSubject.pipe(
      timeout(this.REFRESH_TIMEOUT_MS + 1000), // Un peu plus que le timeout du refresh
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        if (!token) {
          throw new Error('Token null reçu après refresh');
        }
        
        console.log('[TokenRefreshManager] 🔄 Refresh terminé, token disponible');
        
        // Retourner un objet simulant la réponse du refresh
        return of({ tokens: { access_token: token } } as T);
      }),
      catchError((error) => {
        console.error('[TokenRefreshManager] ❌ Timeout ou erreur lors de l\'attente:', error);
        this.resetRefreshState();
        return throwError(() => error);
      })
    );
  }

  /**
   * Retourne un observable qui émet le nouveau token quand disponible
   */
  getNewTokenWhenAvailable(): Observable<string> {
    return this.refreshTokenSubject.pipe(
      timeout(this.REFRESH_TIMEOUT_MS + 1000),
      filter(token => token !== null),
      take(1),
      catchError((error) => {
        console.error('[TokenRefreshManager] ❌ Timeout lors de l\'attente du token');
        this.resetRefreshState();
        return throwError(() => error);
      })
    ) as Observable<string>;
  }

  /**
   * Force le reset de l'état (en cas d'erreur critique)
   */
  forceReset(): void {
    console.warn('[TokenRefreshManager] 🚨 Reset forcé de l\'état');
    this.resetRefreshState();
  }

  /**
   * Reset l'état du refresh de manière thread-safe
   */
  private resetRefreshState(): void {
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
  }

  /**
   * Nettoyage lors de la destruction du service
   */
  ngOnDestroy(): void {
    this.refreshTokenSubject.complete();
  }
}