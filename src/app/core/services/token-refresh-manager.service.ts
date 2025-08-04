import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, throwError, timer, of, EMPTY } from 'rxjs';
import { switchMap, catchError, timeout, finalize, filter, take, share } from 'rxjs/operators';
import { LoggerService } from './logger.service';

/**
 * Service pour gérer l'état du refresh des tokens de manière thread-safe
 * PHASE 2-2: Remplacement des variables globales de l'interceptor auth
 */
@Injectable({
  providedIn: 'root'
})
export class TokenRefreshManagerService implements OnDestroy {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private currentRefreshOperation: Observable<any> | null = null;
  
  // Configuration des timeouts
  private readonly REFRESH_TIMEOUT_MS = 10000; // 10 secondes
  private readonly CLEANUP_DELAY_MS = 1000; // 1 seconde pour cleanup

  constructor(private logger: LoggerService) {}

  /**
   * Vérifie si un refresh est actuellement en cours
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Démarre un processus de refresh des tokens avec protection contre les race conditions
   */
  refreshTokens<T>(refreshOperation: () => Observable<T>): Observable<T> {
    // Si un refresh est déjà en cours, retourner l'observable partagé
    if (this.isRefreshing && this.currentRefreshOperation) {
      this.logger.debug('Token refresh déjà en cours, réutilisation');
      return this.currentRefreshOperation;
    }

    this.logger.info('Démarrage du processus de refresh des tokens');
    
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    // Créer et stocker l'opération de refresh pour la partager
    this.currentRefreshOperation = refreshOperation().pipe(
      timeout(this.REFRESH_TIMEOUT_MS),
      switchMap((response: any) => {
        const newToken = response.tokens?.access_token;
        
        if (!newToken) {
          throw new Error('Token manquant dans la réponse de refresh');
        }

        this.logger.info('Tokens rafraîchis avec succès');
        this.refreshTokenSubject.next(newToken);
        
        return of(response);
      }),
      catchError((error) => {
        this.logger.error('Échec du refresh des tokens:', error);
        this.refreshTokenSubject.error(error);
        return throwError(() => error);
      }),
      finalize(() => {
        // Cleanup immédiat mais thread-safe
        this.resetRefreshState();
      }),
      share() // Partager l'observable pour éviter les requêtes multiples
    );

    return this.currentRefreshOperation;
  }

  /**
   * Attend que le refresh en cours se termine et retourne le nouveau token
   * DEPRECATED: Utiliser refreshTokens() qui gère automatiquement la réutilisation
   */
  private waitForRefreshCompletion<T>(): Observable<T> {
    if (this.currentRefreshOperation) {
      return this.currentRefreshOperation;
    }

    return this.refreshTokenSubject.pipe(
      timeout(this.REFRESH_TIMEOUT_MS + 1000),
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        if (!token) {
          throw new Error('Token null reçu après refresh');
        }
        
        this.logger.debug('Refresh terminé, token disponible');
        return of({ tokens: { access_token: token } } as T);
      }),
      catchError((error) => {
        this.logger.error('Timeout ou erreur lors de l\'attente du refresh:', error);
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
        this.logger.error('Timeout lors de l\'attente du token:', error);
        this.resetRefreshState();
        return throwError(() => error);
      })
    ) as Observable<string>;
  }

  /**
   * Force le reset de l'état (en cas d'erreur critique)
   */
  forceReset(): void {
    this.logger.warn('Reset forcé de l\'état de refresh');
    this.resetRefreshState();
  }

  /**
   * Reset l'état du refresh de manière thread-safe
   */
  private resetRefreshState(): void {
    this.isRefreshing = false;
    this.currentRefreshOperation = null;
    this.refreshTokenSubject = new BehaviorSubject<string | null>(null);
  }

  /**
   * Nettoyage lors de la destruction du service
   */
  ngOnDestroy(): void {
    this.refreshTokenSubject.complete();
  }
}