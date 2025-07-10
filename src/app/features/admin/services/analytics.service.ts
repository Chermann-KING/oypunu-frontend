import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  usersByRole: {
    user: number;
    contributor: number;
    admin: number;
    superadmin: number;
  };
  dailyActiveUsers: {
    date: string;
    count: number;
  }[];
  userGrowthChart: {
    date: string;
    total: number;
    new: number;
  }[];
}

export interface ContentAnalytics {
  totalWords: number;
  wordsToday: number;
  wordsThisWeek: number;
  wordsThisMonth: number;
  wordsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  wordsByLanguage: {
    language: string;
    count: number;
    percentage: number;
  }[];
  topContributors: {
    username: string;
    wordsCount: number;
    translationsCount: number;
    score: number;
  }[];
  contentGrowthChart: {
    date: string;
    words: number;
    translations: number;
  }[];
}

export interface CommunityAnalytics {
  totalCommunities: number;
  activeCommunities: number;
  totalPosts: number;
  postsToday: number;
  postsThisWeek: number;
  topCommunities: {
    name: string;
    members: number;
    posts: number;
    activity: number;
  }[];
  engagementChart: {
    date: string;
    posts: number;
    comments: number;
    likes: number;
  }[];
}

export interface SystemMetrics {
  serverUptime: string;
  totalRequests: number;
  requestsToday: number;
  averageResponseTime: number;
  errorRate: number;
  diskUsage: number;
  memoryUsage: number;
  activeConnections: number;
  performanceChart: {
    time: string;
    responseTime: number;
    requests: number;
    errors: number;
  }[];
}

export interface AnalyticsOverview {
  users: UserAnalytics;
  content: ContentAnalytics;
  communities: CommunityAnalytics;
  system: SystemMetrics;
  generatedAt: string;
}

export interface ExportReport {
  type: 'users' | 'content' | 'communities' | 'full';
  format: 'json' | 'csv';
  period: '7d' | '30d' | '90d' | '1y' | 'all';
  data: any;
  exportedAt: string;
  exportedBy: string;
}

export type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/analytics`;
  private readonly reportsUrl = `${environment.apiUrl}/admin/reports`;

  // États de cache pour éviter les appels répétés
  private userAnalyticsCache = new BehaviorSubject<UserAnalytics | null>(null);
  private contentAnalyticsCache = new BehaviorSubject<ContentAnalytics | null>(null);
  private communityAnalyticsCache = new BehaviorSubject<CommunityAnalytics | null>(null);
  private systemMetricsCache = new BehaviorSubject<SystemMetrics | null>(null);

  // Observables publics
  public userAnalytics$ = this.userAnalyticsCache.asObservable();
  public contentAnalytics$ = this.contentAnalyticsCache.asObservable();
  public communityAnalytics$ = this.communityAnalyticsCache.asObservable();
  public systemMetrics$ = this.systemMetricsCache.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * 📊 ANALYTICS UTILISATEURS
   */
  getUserAnalytics(period: TimePeriod = '30d', forceRefresh: boolean = false): Observable<UserAnalytics> {
    if (!forceRefresh && this.userAnalyticsCache.value) {
      return this.userAnalytics$.pipe(
        filter(data => data !== null),
        map(data => data!)
      );
    }

    const params = new HttpParams().set('period', period);
    
    const request = this.http.get<UserAnalytics>(`${this.apiUrl}/users`, { params });
    
    request.subscribe(
      data => this.userAnalyticsCache.next(data),
      error => console.error('Erreur lors du chargement des analytics utilisateurs:', error)
    );
    
    return request;
  }

  /**
   * 📚 ANALYTICS CONTENU
   */
  getContentAnalytics(forceRefresh: boolean = false): Observable<ContentAnalytics> {
    if (!forceRefresh && this.contentAnalyticsCache.value) {
      return this.contentAnalytics$.pipe(
        filter(data => data !== null),
        map(data => data!)
      );
    }

    const request = this.http.get<ContentAnalytics>(`${this.apiUrl}/content`);
    
    request.subscribe(
      data => this.contentAnalyticsCache.next(data),
      error => console.error('Erreur lors du chargement des analytics contenu:', error)
    );
    
    return request;
  }

  /**
   * 👥 ANALYTICS COMMUNAUTÉS
   */
  getCommunityAnalytics(forceRefresh: boolean = false): Observable<CommunityAnalytics> {
    if (!forceRefresh && this.communityAnalyticsCache.value) {
      return this.communityAnalytics$.pipe(
        filter(data => data !== null),
        map(data => data!)
      );
    }

    const request = this.http.get<CommunityAnalytics>(`${this.apiUrl}/communities`);
    
    request.subscribe(
      data => this.communityAnalyticsCache.next(data),
      error => console.error('Erreur lors du chargement des analytics communautés:', error)
    );
    
    return request;
  }

  /**
   * 🔧 MÉTRIQUES SYSTÈME
   */
  getSystemMetrics(forceRefresh: boolean = false): Observable<SystemMetrics> {
    if (!forceRefresh && this.systemMetricsCache.value) {
      return this.systemMetrics$.pipe(
        filter(data => data !== null),
        map(data => data!)
      );
    }

    const request = this.http.get<SystemMetrics>(`${this.apiUrl}/system`);
    
    request.subscribe(
      data => this.systemMetricsCache.next(data),
      error => console.error('Erreur lors du chargement des métriques système:', error)
    );
    
    return request;
  }

  /**
   * 📈 VUE D'ENSEMBLE COMPLÈTE
   */
  getAnalyticsOverview(period: TimePeriod = '30d'): Observable<AnalyticsOverview> {
    const params = new HttpParams().set('period', period);
    return this.http.get<AnalyticsOverview>(`${this.apiUrl}/overview`, { params });
  }

  /**
   * 📄 EXPORT DE RAPPORTS
   */
  exportReport(
    type: 'users' | 'content' | 'communities' | 'full',
    format: 'json' | 'csv' = 'json',
    period: TimePeriod = '30d'
  ): Observable<ExportReport> {
    const params = new HttpParams()
      .set('type', type)
      .set('format', format)
      .set('period', period);
    
    return this.http.get<ExportReport>(`${this.reportsUrl}/export`, { params });
  }

  /**
   * 📥 TÉLÉCHARGER RAPPORT
   */
  downloadReport(
    type: 'users' | 'content' | 'communities' | 'full',
    format: 'json' | 'csv' = 'json',
    period: TimePeriod = '30d'
  ): void {
    this.exportReport(type, format, period).subscribe(
      report => {
        this.downloadFile(report, format);
      },
      error => {
        console.error('Erreur lors du téléchargement du rapport:', error);
      }
    );
  }

  /**
   * 🔄 ACTUALISER TOUTES LES DONNÉES
   */
  refreshAllAnalytics(period: TimePeriod = '30d'): void {
    this.getUserAnalytics(period, true).subscribe();
    this.getContentAnalytics(true).subscribe();
    this.getCommunityAnalytics(true).subscribe();
    this.getSystemMetrics(true).subscribe();
  }

  /**
   * 🗑️ VIDER LE CACHE
   */
  clearCache(): void {
    this.userAnalyticsCache.next(null);
    this.contentAnalyticsCache.next(null);
    this.communityAnalyticsCache.next(null);
    this.systemMetricsCache.next(null);
  }

  /**
   * 📊 UTILITAIRES POUR GRAPHIQUES
   */
  
  // Convertir les données utilisateur pour ApexCharts
  formatUserGrowthData(userAnalytics: UserAnalytics) {
    return {
      series: [
        {
          name: 'Utilisateurs totaux',
          data: userAnalytics.userGrowthChart.map(item => item.total)
        },
        {
          name: 'Nouveaux utilisateurs',
          data: userAnalytics.userGrowthChart.map(item => item.new)
        }
      ],
      categories: userAnalytics.userGrowthChart.map(item => 
        new Date(item.date).toLocaleDateString('fr-FR', { 
          month: 'short', 
          day: 'numeric' 
        })
      )
    };
  }

  // Convertir les données de contenu pour ApexCharts
  formatContentGrowthData(contentAnalytics: ContentAnalytics) {
    return {
      series: [
        {
          name: 'Mots créés',
          data: contentAnalytics.contentGrowthChart.map(item => item.words)
        },
        {
          name: 'Traductions ajoutées',
          data: contentAnalytics.contentGrowthChart.map(item => item.translations)
        }
      ],
      categories: contentAnalytics.contentGrowthChart.map(item => 
        new Date(item.date).toLocaleDateString('fr-FR', { 
          month: 'short', 
          day: 'numeric' 
        })
      )
    };
  }

  // Convertir les données de répartition par langue pour graphique en secteurs
  formatLanguageDistributionData(contentAnalytics: ContentAnalytics) {
    return {
      series: contentAnalytics.wordsByLanguage.map(item => ({
        name: item.language,
        value: item.count
      })),
      labels: contentAnalytics.wordsByLanguage.map(item => item.language)
    };
  }

  // Convertir les données d'engagement pour graphique d'aires
  formatEngagementData(communityAnalytics: CommunityAnalytics) {
    return {
      series: [
        {
          name: 'Posts',
          data: communityAnalytics.engagementChart.map(item => item.posts)
        },
        {
          name: 'Commentaires',
          data: communityAnalytics.engagementChart.map(item => item.comments)
        },
        {
          name: 'Likes',
          data: communityAnalytics.engagementChart.map(item => item.likes)
        }
      ],
      categories: communityAnalytics.engagementChart.map(item => 
        new Date(item.date).toLocaleDateString('fr-FR', { 
          month: 'short', 
          day: 'numeric' 
        })
      )
    };
  }

  // Convertir les données de performance système
  formatPerformanceData(systemMetrics: SystemMetrics) {
    return {
      series: [
        {
          name: 'Temps de réponse (ms)',
          data: systemMetrics.performanceChart.map(item => item.responseTime)
        },
        {
          name: 'Requêtes/h',
          data: systemMetrics.performanceChart.map(item => Math.round(item.requests / 100)) // Échelle réduite
        }
      ],
      categories: systemMetrics.performanceChart.map(item => 
        new Date(item.time).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      )
    };
  }

  /**
   * 💾 MÉTHODES PRIVÉES
   */
  private downloadFile(report: ExportReport, format: string): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      content = this.convertToCSV(report.data);
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      content = JSON.stringify(report, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oypunu-${report.type}-report-${report.period}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: any): string {
    // Implémentation basique de conversion JSON vers CSV
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      );
      
      return [csvHeaders, ...csvRows].join('\n');
    }
    
    // Pour les objets, créer un CSV simple clé-valeur
    const entries = Object.entries(data);
    return entries.map(([key, value]) => `${key},${JSON.stringify(value)}`).join('\n');
  }
}