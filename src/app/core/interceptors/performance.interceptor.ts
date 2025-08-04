import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { PerformanceService } from '../../shared/services/performance.service';
import { ToastService } from '../../shared/services/toast.service';

@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  private pendingRequests = new Map<string, number>();
  private slowRequestThreshold = 3000; // 3 secondes
  private retryAttempts = new Map<string, number>();

  constructor(
    private performanceService: PerformanceService,
    private toastService: ToastService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId(req);
    
    // Enregistrer le début de la requête
    this.pendingRequests.set(requestId, startTime);

    // Vérifier si c'est un retry
    const currentAttempts = this.retryAttempts.get(requestId) || 0;
    if (currentAttempts > 0) {
      // Ajouter un header pour identifier les retentatives
      req = req.clone({
        setHeaders: {
          'X-Retry-Attempt': currentAttempts.toString()
        }
      });
    }

    return next.handle(req).pipe(
      tap({
        next: (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            this.handleSuccess(requestId, startTime, req, event);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(requestId, startTime, req, error);
        }
      }),
      finalize(() => {
        // Nettoyer les maps
        this.pendingRequests.delete(requestId);
        
        // Ne supprimer les retry attempts qu'après un délai pour permettre les retentatives
        setTimeout(() => {
          this.retryAttempts.delete(requestId);
        }, 30000);
      })
    );
  }

  /**
   * Gère les réponses réussies
   */
  private handleSuccess(
    requestId: string, 
    startTime: number, 
    req: HttpRequest<any>, 
    response: HttpResponse<any>
  ): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Enregistrer les métriques
    this.performanceService.recordApiCall(responseTime);
    this.performanceService.recordUserAction();

    // Alerter si la requête est trop lente
    if (responseTime > this.slowRequestThreshold) {
      const endpoint = this.getEndpointName(req.url);
      this.toastService.warning(
        'Requête lente détectée',
        `${endpoint} a pris ${(responseTime / 1000).toFixed(1)}s à répondre`,
        { duration: 3000 }
      );
    }

    // Succès après retry
    const attempts = this.retryAttempts.get(requestId) || 0;
    if (attempts > 0) {
      this.toastService.success(
        'Reconnexion réussie',
        `Requête réussie après ${attempts} tentative${attempts > 1 ? 's' : ''}`,
        { duration: 2000 }
      );
    }
  }

  /**
   * Gère les erreurs de requête
   */
  private handleError(
    requestId: string,
    startTime: number,
    req: HttpRequest<any>,
    error: HttpErrorResponse
  ): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endpoint = this.getEndpointName(req.url);

    // Enregistrer les métriques d'erreur
    this.performanceService.recordApiCall(responseTime);

    // Déterminer le type d'erreur et la réponse appropriée
    let shouldRetry = false;
    let errorMessage = '';
    let userMessage = '';

    switch (error.status) {
      case 0:
        // Erreur de réseau
        errorMessage = 'Erreur de connexion réseau';
        userMessage = 'Vérifiez votre connexion internet';
        shouldRetry = true;
        break;
      
      case 408:
      case 504:
        // Timeout
        errorMessage = 'Délai d\'attente dépassé';
        userMessage = 'Le serveur met trop de temps à répondre';
        shouldRetry = true;
        break;
      
      case 429:
        // Too Many Requests
        errorMessage = 'Trop de requêtes';
        userMessage = 'Veuillez patienter avant de réessayer';
        shouldRetry = false;
        break;
      
      case 500:
      case 502:
      case 503:
        // Erreurs serveur
        errorMessage = 'Erreur serveur';
        userMessage = 'Le serveur rencontre des difficultés';
        shouldRetry = true;
        break;
      
      default:
        errorMessage = `Erreur ${error.status}`;
        userMessage = error.error?.message || 'Une erreur est survenue';
        shouldRetry = false;
    }

    // Gérer les tentatives de retry
    const currentAttempts = this.retryAttempts.get(requestId) || 0;
    const maxRetries = this.getMaxRetries(error.status);

    if (shouldRetry && currentAttempts < maxRetries) {
      // Préparer pour retry
      this.retryAttempts.set(requestId, currentAttempts + 1);
      
      this.toastService.info(
        'Nouvelle tentative...',
        `Tentative ${currentAttempts + 1}/${maxRetries} pour ${endpoint}`,
        { duration: 1500 }
      );
    } else {
      // Erreur finale
      this.toastService.error(
        errorMessage,
        `${endpoint}: ${userMessage}`,
        { 
          duration: 5000,
          dismissible: true
        }
      );

      // Si c'était après plusieurs tentatives
      if (currentAttempts > 0) {
        this.toastService.error(
          'Échec définitif',
          `Impossible de contacter ${endpoint} après ${currentAttempts + 1} tentatives`,
          { duration: 8000 }
        );
      }
    }
  }

  /**
   * Génère un ID unique pour chaque requête
   */
  private generateRequestId(req: HttpRequest<any>): string {
    return `${req.method}_${req.url.split('?')[0]}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extrait le nom de l'endpoint pour l'affichage
   */
  private getEndpointName(url: string): string {
    try {
      const path = new URL(url).pathname;
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length === 0) return 'API';
      
      // Prendre les 2 derniers segments ou le dernier si un seul
      const relevantSegments = segments.slice(-2);
      return relevantSegments.join('/');
    } catch {
      // Si l'URL n'est pas valide, essayer d'extraire manuellement
      const pathMatch = url.match(/\/([^\/\?]+(?:\/[^\/\?]+)?)(\?|$)/);
      return pathMatch ? pathMatch[1] : 'API';
    }
  }

  /**
   * Détermine le nombre maximum de tentatives selon le type d'erreur
   */
  private getMaxRetries(status: number): number {
    switch (status) {
      case 0:   // Network error
      case 408: // Request Timeout
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        return 3;
      
      case 500: // Internal Server Error
        return 2;
      
      case 429: // Too Many Requests
        return 1;
      
      default:
        return 0; // Pas de retry pour les autres erreurs
    }
  }

  /**
   * Vérifie si une requête devrait être retentée
   */
  private shouldRetryRequest(error: HttpErrorResponse): boolean {
    // Liste des codes d'état qui justifient un retry
    const retryableStatuses = [0, 408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }

  /**
   * Calcule le délai d'attente avant retry (backoff exponentiel)
   */
  private getRetryDelay(attempt: number): number {
    // Backoff exponentiel: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }
}