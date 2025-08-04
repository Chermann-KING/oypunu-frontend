import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiHealthStatus {
  isOnline: boolean;
  responseTime: number;
  lastChecked: Date;
  error?: string;
  status?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiHealthService {
  private healthStatusSubject = new BehaviorSubject<ApiHealthStatus>({
    isOnline: false,
    responseTime: 0,
    lastChecked: new Date()
  });

  public healthStatus$ = this.healthStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    // Vérifier la santé de l'API au démarrage
    this.checkApiHealth();
    
    // Vérifier périodiquement (toutes les 2 minutes)
    timer(0, 120000).subscribe(() => {
      this.checkApiHealth();
    });
  }

  /**
   * Vérifie la santé de l'API principal
   */
  checkApiHealth(): void {
    const startTime = Date.now();
    
    this.http.get(`${environment.apiUrl}/health`)
      .pipe(
        timeout(10000), // Timeout de 10 secondes
        catchError((error: HttpErrorResponse) => {
          return this.handleHealthCheckError(error, startTime);
        })
      )
      .subscribe({
        next: (response) => {
          const responseTime = Date.now() - startTime;
          this.updateHealthStatus({
            isOnline: true,
            responseTime,
            lastChecked: new Date()
          });
        },
        error: () => {
          // Déjà géré dans catchError
        }
      });
  }

  /**
   * Teste spécifiquement l'endpoint des activités
   */
  checkActivitiesEndpoint(): Observable<boolean> {
    const startTime = Date.now();
    
    return this.http.get(`${environment.apiUrl}/activities/recent?limit=1`)
      .pipe(
        timeout(8000),
        map((response: any) => {
          const responseTime = Date.now() - startTime;
          this.updateHealthStatus({
            isOnline: true,
            responseTime,
            lastChecked: new Date()
          });
          return true;
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleHealthCheckError(error, startTime);
          return [false];
        })
      );
  }

  /**
   * Teste la connexion WebSocket
   */
  checkWebSocketConnection(): Observable<boolean> {
    return new Observable(observer => {
      try {
        const testSocket = new WebSocket(environment.websocketUrl.replace('http', 'ws'));
        
        const timeout = setTimeout(() => {
          testSocket.close();
          observer.next(false);
          observer.complete();
        }, 5000);

        testSocket.onopen = () => {
          clearTimeout(timeout);
          testSocket.close();
          observer.next(true);
          observer.complete();
        };

        testSocket.onerror = () => {
          clearTimeout(timeout);
          observer.next(false);
          observer.complete();
        };

        testSocket.onclose = () => {
          clearTimeout(timeout);
          observer.complete();
        };

      } catch (error) {
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Obtient un rapport de diagnostic complet
   */
  getDiagnosticReport(): Observable<{
    api: ApiHealthStatus;
    activities: boolean;
    websocket: boolean;
    environment: string;
  }> {
    return new Observable(observer => {
      const report: any = {
        api: this.healthStatusSubject.value,
        environment: environment.production ? 'production' : 'development'
      };

      // Tester l'endpoint des activités
      this.checkActivitiesEndpoint().subscribe(activitiesWorking => {
        report.activities = activitiesWorking;

        // Tester WebSocket
        this.checkWebSocketConnection().subscribe(websocketWorking => {
          report.websocket = websocketWorking;
          observer.next(report);
          observer.complete();
        });
      });
    });
  }

  /**
   * Gère les erreurs de vérification de santé
   */
  private handleHealthCheckError(error: HttpErrorResponse, startTime: number): Observable<never> {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Erreur inconnue';

    switch (error.status) {
      case 0:
        errorMessage = 'Impossible de joindre le serveur (CORS ou réseau)';
        break;
      case 404:
        errorMessage = 'Endpoint de santé non trouvé';
        break;
      case 500:
        errorMessage = 'Erreur serveur interne';
        break;
      case 503:
        errorMessage = 'Service temporairement indisponible';
        break;
      default:
        errorMessage = `Erreur HTTP ${error.status}: ${error.message}`;
    }

    this.updateHealthStatus({
      isOnline: false,
      responseTime,
      lastChecked: new Date(),
      error: errorMessage,
      status: error.status
    });

    throw error;
  }

  /**
   * Met à jour le statut de santé
   */
  private updateHealthStatus(status: ApiHealthStatus): void {
    this.healthStatusSubject.next(status);
  }

  /**
   * Obtient le statut actuel de l'API
   */
  getCurrentHealthStatus(): ApiHealthStatus {
    return this.healthStatusSubject.value;
  }

  /**
   * Force une nouvelle vérification
   */
  forceHealthCheck(): void {
    this.checkApiHealth();
  }

  /**
   * Obtient une recommandation basée sur le statut de l'API
   */
  getConnectionRecommendation(): string {
    const status = this.getCurrentHealthStatus();
    
    if (!status.isOnline) {
      if (status.error?.includes('CORS')) {
        return 'Problème de CORS - vérifiez la configuration du serveur';
      } else if (status.error?.includes('réseau')) {
        return 'Problème de réseau - vérifiez votre connexion internet';
      } else if (status.status === 404) {
        return 'API non disponible - vérifiez l\'URL du serveur';
      } else {
        return 'Serveur hors ligne - contactez l\'administrateur';
      }
    } else if (status.responseTime > 5000) {
      return 'Connexion lente - performances dégradées';
    } else if (status.responseTime > 2000) {
      return 'Connexion acceptable mais pourrait être améliorée';
    } else {
      return 'Connexion excellente';
    }
  }
}