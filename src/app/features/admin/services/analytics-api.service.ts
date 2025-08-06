/**
 * @fileoverview Service API Analytics - Intégration des 12 routes analytics du backend
 * 
 * Service spécialisé pour toutes les interactions avec l'API d'analytics.
 * Séparé du AdminApiService pour respecter le Single Responsibility Principle.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { 
  DashboardMetrics,
  UserActivityStats,
  ContentAnalytics,
  CommunityAnalytics,
  SystemMetrics
} from '../models/admin.models';

/**
 * Interfaces spécifiques aux analytics (autres que celles du modèle principal)
 */

export interface LanguageStats {
  readonly language: string;
  readonly count: number;
  readonly percentage: number;
}

export interface ContributorMetric {
  readonly userId: string;
  readonly username: string;
  readonly contributionCount: number;
  readonly lastContribution: string;
}

export interface LanguagePreference {
  readonly language: string;
  readonly wordCount: number;
  readonly viewCount: number;
}

export interface LanguageTrends {
  readonly trends: LanguageTrend[];
  readonly timeframe: string;
  readonly generatedAt: string;
}

export interface LanguageTrend {
  readonly language: string;
  readonly currentPeriod: number;
  readonly previousPeriod: number;
  readonly growth: number;
  readonly growthPercentage: number;
}

export interface MostSearchedWordsResponse {
  readonly words: SearchedWord[];
  readonly totalSearches: number;
  readonly timeframe: string;
}

export interface SearchedWord {
  readonly wordId: string;
  readonly word: string;
  readonly language: string;
  readonly searchCount: number;
  readonly uniqueUsers: number;
  readonly lastSearched: string;
}

export interface PerformanceMetrics {
  readonly database: {
    readonly avgResponseTime: number;
    readonly slowQueries: number;
    readonly connectionCount: number;
  };
  readonly api: {
    readonly requestsPerMinute: number;
    readonly avgResponseTime: number;
    readonly errorRate: number;
  };
  readonly storage: {
    readonly totalAudioFiles: number;
    readonly totalStorageUsed: string;
    readonly avgFileSize: number;
  };
}

export interface UserEngagementMetrics {
  readonly activeUsers: {
    readonly daily: number;
    readonly weekly: number;
    readonly monthly: number;
  };
  readonly engagement: {
    readonly avgSessionDuration: number;
    readonly avgWordsViewedPerSession: number;
    readonly bounceRate: number;
    readonly returnUserRate: number;
  };
  readonly features: {
    readonly searchUsage: number;
    readonly favoriteUsage: number;
    readonly audioPlaybacks: number;
    readonly shareActions: number;
  };
}

export interface PersonalStats {
  readonly profile: {
    readonly username: string;
    readonly joinDate: string;
    readonly role: string;
  };
  readonly contributions: {
    readonly totalWords: number;
    readonly approvedWords: number;
    readonly wordsThisMonth: number;
    readonly rank: number;
  };
  readonly activity: {
    readonly totalViews: number;
    readonly uniqueWords: number;
    readonly streakDays: number;
    readonly favoriteWords: number;
  };
  readonly achievements: Achievement[];
}

export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly unlockedAt: string;
}

export interface ExportOptions {
  readonly format: 'json' | 'csv';
  readonly type: 'dashboard' | 'users' | 'words' | 'activity';
  readonly startDate?: Date;
  readonly endDate?: Date;
}

/**
 * Service API Analytics - Single Responsibility Principle
 * 
 * Ce service se concentre uniquement sur les appels API d'analytics.
 * Il est séparé du AdminApiService pour une meilleure maintenabilité.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsApiService {
  private readonly baseUrl = `${environment.apiUrl}/analytics`;
  private readonly retryCount = 2;

  constructor(private readonly http: HttpClient) {}

  // ===== DASHBOARD ANALYTICS =====

  /**
   * Tableau de bord analytics pour admins
   * GET /analytics/dashboard
   */
  getDashboard(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/dashboard`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== USER ANALYTICS =====

  /**
   * Statistiques détaillées d'un utilisateur
   * GET /analytics/user-activity/:userId
   */
  getUserActivity(userId: string): Observable<UserActivityStats> {
    return this.http.get<UserActivityStats>(`${this.baseUrl}/user-activity/${userId}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Statistiques personnelles de l'utilisateur connecté
   * GET /analytics/my-stats
   */
  getMyStats(): Observable<PersonalStats> {
    return this.http.get<PersonalStats>(`${this.baseUrl}/my-stats`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== LANGUAGE ANALYTICS =====

  /**
   * Tendances par langue
   * GET /analytics/language-trends
   */
  getLanguageTrends(timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'): Observable<LanguageTrends> {
    const params = new HttpParams().set('timeframe', timeframe);

    return this.http.get<LanguageTrends>(`${this.baseUrl}/language-trends`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Mots les plus recherchés
   * GET /analytics/most-searched-words
   */
  getMostSearchedWords(
    limit: number = 20,
    language?: string,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'week'
  ): Observable<MostSearchedWordsResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('timeframe', timeframe);

    if (language) {
      params = params.set('language', language);
    }

    return this.http.get<MostSearchedWordsResponse>(`${this.baseUrl}/most-searched-words`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== PERFORMANCE ANALYTICS =====

  /**
   * Métriques de performance système
   * GET /analytics/performance-metrics
   */
  getPerformanceMetrics(): Observable<PerformanceMetrics> {
    return this.http.get<PerformanceMetrics>(`${this.baseUrl}/performance-metrics`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Métriques d'engagement utilisateur
   * GET /analytics/user-engagement
   */
  getUserEngagement(timeframe: 'day' | 'week' | 'month' = 'week'): Observable<UserEngagementMetrics> {
    const params = new HttpParams().set('timeframe', timeframe);

    return this.http.get<UserEngagementMetrics>(`${this.baseUrl}/user-engagement`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== CONTENT ANALYTICS =====

  /**
   * Analytics de contenu et modération
   * GET /analytics/content-analytics
   */
  getContentAnalytics(): Observable<ContentAnalytics> {
    return this.http.get<ContentAnalytics>(`${this.baseUrl}/content-analytics`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== COMMUNITY ANALYTICS =====

  /**
   * Analytics des communautés
   * GET /analytics/community-analytics
   */
  getCommunityAnalytics(): Observable<CommunityAnalytics> {
    return this.http.get<CommunityAnalytics>(`${this.baseUrl}/community-analytics`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== SYSTEM METRICS =====

  /**
   * Métriques système complètes
   * GET /analytics/system-metrics
   */
  getSystemMetrics(): Observable<SystemMetrics> {
    return this.http.get<SystemMetrics>(`${this.baseUrl}/system-metrics`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== DATA EXPORT =====

  /**
   * Export des données analytics
   * GET /analytics/export
   */
  exportData(options: ExportOptions): Observable<any> {
    let params = new HttpParams()
      .set('format', options.format)
      .set('type', options.type);

    if (options.startDate) {
      params = params.set('startDate', options.startDate.toISOString());
    }
    if (options.endDate) {
      params = params.set('endDate', options.endDate.toISOString());
    }

    return this.http.get<any>(`${this.baseUrl}/export`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Construit des paramètres de période de temps standardisés
   */
  buildTimeRangeParams(
    startDate?: Date,
    endDate?: Date,
    period?: 'day' | 'week' | 'month' | 'year'
  ): HttpParams {
    let params = new HttpParams();

    if (period) {
      params = params.set('period', period);
    }

    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }

    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return params;
  }

  /**
   * Formate les données de performance pour les graphiques
   */
  formatPerformanceDataForCharts(metrics: PerformanceMetrics): any {
    return {
      labels: ['Base de données', 'API', 'Stockage'],
      datasets: [
        {
          label: 'Temps de réponse (ms)',
          data: [
            metrics.database.avgResponseTime,
            metrics.api.avgResponseTime,
            0 // Le stockage n'a pas de temps de réponse
          ],
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
        }
      ]
    };
  }

  /**
   * Formate les données de tendances linguistiques pour les graphiques
   */
  formatLanguageTrendsForCharts(trends: LanguageTrends): any {
    return {
      labels: trends.trends.map(t => t.language),
      datasets: [
        {
          label: 'Période actuelle',
          data: trends.trends.map(t => t.currentPeriod),
          backgroundColor: '#3B82F6'
        },
        {
          label: 'Période précédente',
          data: trends.trends.map(t => t.previousPeriod),
          backgroundColor: '#94A3B8'
        }
      ]
    };
  }

  /**
   * Calcule les métriques dérivées à partir des données brutes
   */
  calculateDerivedMetrics(baseMetrics: any): any {
    return {
      ...baseMetrics,
      derived: {
        totalGrowthRate: this.calculateTotalGrowthRate(baseMetrics),
        userRetentionRate: this.calculateRetentionRate(baseMetrics),
        contentQualityScore: this.calculateQualityScore(baseMetrics)
      }
    };
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Gestion centralisée des erreurs HTTP pour analytics
   */
  private handleError = (error: any): Observable<never> => {
    console.error('AnalyticsApiService Error:', error);
    
    let errorMessage = 'Erreur lors de la récupération des analytics';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 403:
          errorMessage = 'Accès refusé aux analytics';
          break;
        case 404:
          errorMessage = 'Données analytics non trouvées';
          break;
        case 500:
          errorMessage = 'Erreur serveur lors du calcul des analytics';
          break;
        default:
          errorMessage = error.error?.message || `Erreur ${error.status}: ${error.statusText}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Calcule le taux de croissance global
   */
  private calculateTotalGrowthRate(metrics: any): number {
    // Logique de calcul du taux de croissance
    // Implémentation simplifiée
    return 0;
  }

  /**
   * Calcule le taux de rétention des utilisateurs
   */
  private calculateRetentionRate(metrics: any): number {
    // Logique de calcul du taux de rétention
    // Implémentation simplifiée
    return 0;
  }

  /**
   * Calcule le score de qualité du contenu
   */
  private calculateQualityScore(metrics: any): number {
    // Logique de calcul du score de qualité
    // Implémentation simplifiée
    return 0;
  }
}