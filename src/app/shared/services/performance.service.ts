import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface PerformanceMetrics {
  loadTime: number;
  apiResponseTime: number;
  memoryUsage?: number;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
  errorRate: number;
  userActions: number;
}

export interface OptimizationSuggestion {
  type: 'cache' | 'lazy-load' | 'prefetch' | 'compress';
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metricsSubject = new BehaviorSubject<PerformanceMetrics>({
    loadTime: 0,
    apiResponseTime: 0,
    connectionSpeed: 'unknown',
    errorRate: 0,
    userActions: 0
  });

  private suggestionsSubject = new BehaviorSubject<OptimizationSuggestion[]>([]);
  private apiCallTimes: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;
  private userActionCount = 0;
  private startTime = Date.now();

  public metrics$: Observable<PerformanceMetrics> = this.metricsSubject.asObservable();
  public suggestions$: Observable<OptimizationSuggestion[]> = this.suggestionsSubject.asObservable();

  constructor() {
    this.initPerformanceMonitoring();
    this.startPeriodicAnalysis();
  }

  /**
   * Initialise le monitoring des performances
   */
  private initPerformanceMonitoring(): void {
    // Observer les changements de connexion
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.updateConnectionSpeed(connection.effectiveType);
        connection.addEventListener('change', () => {
          this.updateConnectionSpeed(connection.effectiveType);
        });
      }
    }

    // Observer les performances de la page
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const loadTime = performance.now();
          this.updateMetrics({ loadTime });
        }, 100);
      });
    }

    // Observer les erreurs globales
    window.addEventListener('error', () => {
      this.incrementErrorCount();
    });

    window.addEventListener('unhandledrejection', () => {
      this.incrementErrorCount();
    });
  }

  /**
   * Démarre l'analyse périodique des performances
   */
  private startPeriodicAnalysis(): void {
    // Analyser les performances toutes les 30 secondes
    interval(30000).subscribe(() => {
      this.analyzePerformance();
    });

    // Nettoyer les métriques anciennes toutes les 5 minutes
    interval(300000).subscribe(() => {
      this.cleanupOldMetrics();
    });
  }

  /**
   * Enregistre le temps de réponse d'une API
   */
  recordApiCall(responseTime: number): void {
    this.apiCallTimes.push(responseTime);
    this.totalRequests++;
    
    // Garder seulement les 50 derniers appels
    if (this.apiCallTimes.length > 50) {
      this.apiCallTimes.shift();
    }

    const avgResponseTime = this.apiCallTimes.reduce((a, b) => a + b, 0) / this.apiCallTimes.length;
    this.updateMetrics({ apiResponseTime: avgResponseTime });
  }

  /**
   * Enregistre une action utilisateur
   */
  recordUserAction(): void {
    this.userActionCount++;
    this.updateMetrics({ userActions: this.userActionCount });
  }

  /**
   * Incrémente le compteur d'erreurs
   */
  private incrementErrorCount(): void {
    this.errorCount++;
    const errorRate = this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;
    this.updateMetrics({ errorRate });
  }

  /**
   * Met à jour la vitesse de connexion
   */
  private updateConnectionSpeed(effectiveType: string): void {
    let speed: 'slow' | 'fast' | 'unknown' = 'unknown';
    
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        speed = 'slow';
        break;
      case '3g':
      case '4g':
      case '5g':
        speed = 'fast';
        break;
    }

    this.updateMetrics({ connectionSpeed: speed });
  }

  /**
   * Met à jour les métriques
   */
  private updateMetrics(updates: Partial<PerformanceMetrics>): void {
    const currentMetrics = this.metricsSubject.value;
    const newMetrics = { ...currentMetrics, ...updates };
    this.metricsSubject.next(newMetrics);
  }

  /**
   * Analyse les performances et génère des suggestions
   */
  private analyzePerformance(): void {
    const metrics = this.metricsSubject.value;
    const suggestions: OptimizationSuggestion[] = [];

    // Suggestions basées sur le temps de réponse API
    if (metrics.apiResponseTime > 2000) {
      suggestions.push({
        type: 'cache',
        message: 'Les API sont lentes. Considérez l\'implémentation de cache.',
        priority: 'high'
      });
    }

    // Suggestions basées sur la vitesse de connexion
    if (metrics.connectionSpeed === 'slow') {
      suggestions.push({
        type: 'compress',
        message: 'Connexion lente détectée. Optimisez les images et activez la compression.',
        priority: 'high'
      });

      suggestions.push({
        type: 'lazy-load',
        message: 'Implémentez le lazy loading pour améliorer les performances sur connexion lente.',
        priority: 'medium'
      });
    }

    // Suggestions basées sur le temps de chargement
    if (metrics.loadTime > 3000) {
      suggestions.push({
        type: 'prefetch',
        message: 'Temps de chargement élevé. Considérez le prefetching des ressources critiques.',
        priority: 'medium'
      });
    }

    // Suggestions basées sur le taux d'erreur
    if (metrics.errorRate > 5) {
      suggestions.push({
        type: 'cache',
        message: `Taux d'erreur élevé (${metrics.errorRate.toFixed(1)}%). Implémentez un fallback et du retry logic.`,
        priority: 'high'
      });
    }

    this.suggestionsSubject.next(suggestions);
  }

  /**
   * Nettoie les anciennes métriques
   */
  private cleanupOldMetrics(): void {
    // Reset des compteurs périodiques
    if (this.apiCallTimes.length > 20) {
      this.apiCallTimes = this.apiCallTimes.slice(-20);
    }

    // Reset du compteur d'erreurs s'il est trop ancien
    const timeElapsed = Date.now() - this.startTime;
    if (timeElapsed > 3600000) { // 1 heure
      this.errorCount = Math.floor(this.errorCount * 0.8); // Réduction graduelle
    }
  }

  /**
   * Obtient un score de performance global
   */
  getPerformanceScore(): Observable<number> {
    return this.metrics$.pipe(
      map(metrics => {
        let score = 100;

        // Pénalités basées sur les métriques
        if (metrics.loadTime > 3000) score -= 20;
        else if (metrics.loadTime > 2000) score -= 10;

        if (metrics.apiResponseTime > 2000) score -= 20;
        else if (metrics.apiResponseTime > 1000) score -= 10;

        if (metrics.connectionSpeed === 'slow') score -= 15;

        if (metrics.errorRate > 10) score -= 25;
        else if (metrics.errorRate > 5) score -= 15;

        return Math.max(0, score);
      })
    );
  }

  /**
   * Obtient des recommandations spécifiques à la session
   */
  getSessionRecommendations(): OptimizationSuggestion[] {
    const metrics = this.metricsSubject.value;
    const recommendations: OptimizationSuggestion[] = [];

    // Recommandations basées sur l'utilisation
    if (metrics.userActions > 50) {
      recommendations.push({
        type: 'prefetch',
        message: 'Session active détectée. Préchargez les contenus populaires.',
        priority: 'low'
      });
    }

    // Recommandations basées sur la performance globale
    const currentScore = this.getPerformanceScore().pipe(startWith(100));
    
    return recommendations;
  }

  /**
   * Exporte les métriques pour analyse
   */
  exportMetrics(): string {
    const metrics = this.metricsSubject.value;
    const sessionData = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      metrics,
      suggestions: this.suggestionsSubject.value,
      apiCallHistory: this.apiCallTimes.slice(-10)
    };

    return JSON.stringify(sessionData, null, 2);
  }

  /**
   * Réinitialise les métriques
   */
  resetMetrics(): void {
    this.apiCallTimes = [];
    this.errorCount = 0;
    this.totalRequests = 0;
    this.userActionCount = 0;
    this.startTime = Date.now();
    
    this.metricsSubject.next({
      loadTime: 0,
      apiResponseTime: 0,
      connectionSpeed: 'unknown',
      errorRate: 0,
      userActions: 0
    });

    this.suggestionsSubject.next([]);
  }
}