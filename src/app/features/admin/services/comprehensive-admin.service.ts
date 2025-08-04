import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  AdminDashboardOverview,
  UserAnalyticsDetailed,
  ContentAnalyticsDetailed, 
  CommunityAnalyticsDetailed,
  SystemMetricsDetailed,
  ActivityFeed,
  UserManagement,
  ContentModeration,
  CommunityManagement,
  ReportsAndExports,
  User,
  Word,
  Language,
  Community,
  ContributorRequest,
  UserRole,
  AdminPermissions,
  DashboardSection,
  DashboardWidget
} from '../models/comprehensive-admin.models';

@Injectable({
  providedIn: 'root'
})
export class ComprehensiveAdminService {
  private apiUrl = environment.apiUrl;
  
  // Caches pour éviter les requêtes répétées
  private dashboardCache = new BehaviorSubject<AdminDashboardOverview | null>(null);
  private userPermissionsCache = new BehaviorSubject<AdminPermissions | null>(null);
  
  public dashboardData$ = this.dashboardCache.asObservable();
  public userPermissions$ = this.userPermissionsCache.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== OVERVIEW & PERMISSIONS ====================

  /**
   * Récupère la vue d'ensemble complète du tableau de bord
   */
  getDashboardOverview(): Observable<AdminDashboardOverview> {
    return this.http.get<AdminDashboardOverview>(`${this.apiUrl}/admin/dashboard`)
      .pipe(tap(data => this.dashboardCache.next(data)));
  }

  /**
   * Récupère les permissions de l'utilisateur actuel
   */
  getUserPermissions(): Observable<AdminPermissions> {
    return this.http.get<AdminPermissions>(`${this.apiUrl}/admin/permissions`)
      .pipe(tap(permissions => this.userPermissionsCache.next(permissions)));
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Récupère la liste des utilisateurs avec filtres et pagination
   */
  getUsers(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: 'active' | 'suspended' | 'inactive';
    verified?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Observable<UserManagement> {
    let httpParams = new HttpParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<UserManagement>(`${this.apiUrl}/admin/users`, { params: httpParams });
  }

  /**
   * Suspend ou réactive un utilisateur
   */
  updateUserSuspension(userId: string, suspended: boolean, reason?: string): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.apiUrl}/admin/users/${userId}/suspension`, {
      suspended,
      reason
    });
  }

  /**
   * Change le rôle d'un utilisateur (SUPERADMIN seulement)
   */
  updateUserRole(userId: string, newRole: UserRole): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.apiUrl}/admin/users/${userId}/role`, {
      role: newRole
    });
  }

  /**
   * Récupère les analytics détaillées des utilisateurs
   */
  getUserAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Observable<UserAnalyticsDetailed> {
    return this.http.get<UserAnalyticsDetailed>(`${this.apiUrl}/admin/analytics/users`, {
      params: { period }
    });
  }

  // ==================== CONTENT MODERATION ====================

  /**
   * Récupère les mots en attente de modération
   */
  getPendingWords(params: {
    page?: number;
    limit?: number;
    languageId?: string;
    sortBy?: string;
  } = {}): Observable<ContentModeration> {
    let httpParams = new HttpParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<ContentModeration>(`${this.apiUrl}/admin/words/pending`, { params: httpParams });
  }

  /**
   * Modère un mot (approuve ou rejette)
   */
  moderateWord(wordId: string, action: 'approve' | 'reject', reason?: string): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.apiUrl}/admin/words/${wordId}/moderate`, {
      action,
      reason
    });
  }

  /**
   * Récupère les analytics détaillées du contenu
   */
  getContentAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Observable<ContentAnalyticsDetailed> {
    return this.http.get<ContentAnalyticsDetailed>(`${this.apiUrl}/admin/analytics/content`, {
      params: { period }
    });
  }

  // ==================== COMMUNITY MANAGEMENT ====================

  /**
   * Récupère la liste des communautés pour l'administration
   */
  getCommunities(params: {
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive';
    language?: string;
    sortBy?: string;
  } = {}): Observable<CommunityManagement> {
    let httpParams = new HttpParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<CommunityManagement>(`${this.apiUrl}/admin/communities`, { params: httpParams });
  }

  /**
   * Supprime une communauté
   */
  deleteCommunity(communityId: string, reason: string): Observable<{success: boolean}> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/admin/communities/${communityId}`, {
      body: { reason }
    });
  }

  /**
   * Récupère les analytics des communautés
   */
  getCommunityAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Observable<CommunityAnalyticsDetailed> {
    return this.http.get<CommunityAnalyticsDetailed>(`${this.apiUrl}/admin/analytics/communities`, {
      params: { period }
    });
  }

  // ==================== LANGUAGE MANAGEMENT ====================

  /**
   * Récupère les langues en attente d'approbation
   */
  getPendingLanguages(): Observable<Language[]> {
    return this.http.get<Language[]>(`${this.apiUrl}/languages/admin/pending`);
  }

  /**
   * Approuve une langue proposée
   */
  approveLanguage(languageId: string): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.apiUrl}/languages/${languageId}/approve`, {});
  }

  /**
   * Rejette une langue proposée
   */
  rejectLanguage(languageId: string, reason: string): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.apiUrl}/languages/${languageId}/reject`, {
      reason
    });
  }

  // ==================== CONTRIBUTOR REQUESTS ====================

  /**
   * Récupère les demandes de contributeur
   */
  getContributorRequests(params: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected';
    priority?: 'high' | 'medium' | 'low';
    sortBy?: string;
  } = {}): Observable<{
    requests: ContributorRequest[];
    totalCount: number;
    statistics: any;
  }> {
    let httpParams = new HttpParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<{
      requests: ContributorRequest[];
      totalCount: number;
      statistics: any;
    }>(`${this.apiUrl}/contributor-requests`, { params: httpParams });
  }

  /**
   * Évalue une demande de contributeur
   */
  reviewContributorRequest(
    requestId: string, 
    action: 'approve' | 'reject', 
    reviewNote?: string
  ): Observable<{success: boolean}> {
    return this.http.patch<{success: boolean}>(`${this.apiUrl}/contributor-requests/${requestId}/review`, {
      action,
      reviewNote
    });
  }

  // ==================== SYSTEM METRICS ====================

  /**
   * Récupère les métriques système détaillées
   */
  getSystemMetrics(): Observable<SystemMetricsDetailed> {
    return this.http.get<SystemMetricsDetailed>(`${this.apiUrl}/admin/analytics/system`);
  }

  /**
   * Récupère les métriques de performance
   */
  getPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/analytics/performance-metrics`);
  }

  // ==================== ACTIVITY FEED ====================

  /**
   * Récupère le flux d'activité récent
   */
  getActivityFeed(params: {
    limit?: number;
    type?: string;
    priority?: 'low' | 'medium' | 'high';
    since?: Date;
  } = {}): Observable<ActivityFeed[]> {
    let httpParams = new HttpParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof Date) {
          httpParams = httpParams.set(key, value.toISOString());
        } else {
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });

    return this.http.get<ActivityFeed[]>(`${this.apiUrl}/admin/activity`, { params: httpParams });
  }

  // ==================== REPORTS & EXPORTS ====================

  /**
   * Récupère les options de rapports disponibles
   */
  getAvailableReports(): Observable<ReportsAndExports> {
    return this.http.get<ReportsAndExports>(`${this.apiUrl}/admin/reports`);
  }

  /**
   * Exporte des données selon les paramètres spécifiés
   */
  exportData(params: {
    type: 'users' | 'words' | 'communities' | 'analytics';
    format: 'json' | 'csv';
    dateRange?: {
      start: Date;
      end: Date;
    };
    filters?: Record<string, any>;
  }): Observable<Blob> {
    let httpParams = new HttpParams();
    
    httpParams = httpParams.set('type', params.type);
    httpParams = httpParams.set('format', params.format);
    
    if (params.dateRange) {
      httpParams = httpParams.set('startDate', params.dateRange.start.toISOString());
      httpParams = httpParams.set('endDate', params.dateRange.end.toISOString());
    }
    
    if (params.filters) {
      httpParams = httpParams.set('filters', JSON.stringify(params.filters));
    }

    return this.http.get(`${this.apiUrl}/admin/reports/export`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  // ==================== DASHBOARD CONFIGURATION ====================

  /**
   * Récupère les sections disponibles pour le tableau de bord selon le rôle
   */
  getDashboardSections(userRole: UserRole): Observable<DashboardSection[]> {
    return this.http.get<DashboardSection[]>(`${this.apiUrl}/admin/dashboard/sections`, {
      params: { role: userRole }
    });
  }

  /**
   * Récupère les widgets pour le tableau de bord
   */
  getDashboardWidgets(sectionIds: string[]): Observable<DashboardWidget[]> {
    return this.http.post<DashboardWidget[]>(`${this.apiUrl}/admin/dashboard/widgets`, {
      sections: sectionIds
    });
  }

  // ==================== ANALYTICS COMBINED ====================

  /**
   * Récupère toutes les analytics en une seule requête
   */
  getAllAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Observable<{
    overview: AdminDashboardOverview;
    users: UserAnalyticsDetailed;
    content: ContentAnalyticsDetailed;
    communities: CommunityAnalyticsDetailed;
    system: SystemMetricsDetailed;
  }> {
    return forkJoin({
      overview: this.getDashboardOverview(),
      users: this.getUserAnalytics(period),
      content: this.getContentAnalytics(period),
      communities: this.getCommunityAnalytics(period),
      system: this.getSystemMetrics()
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: keyof AdminPermissions): Observable<boolean> {
    return this.userPermissions$.pipe(
      map(permissions => permissions ? permissions[permission] : false)
    );
  }

  /**
   * Vérifie si l'utilisateur a le rôle requis
   */
  hasMinimumRole(requiredRole: UserRole, userRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.USER]: 0,
      [UserRole.CONTRIBUTOR]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPERADMIN]: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Rafraîchit le cache du tableau de bord
   */
  refreshDashboard(): Observable<AdminDashboardOverview> {
    return this.getDashboardOverview();
  }

  /**
   * Nettoie les caches
   */
  clearCache(): void {
    this.dashboardCache.next(null);
    this.userPermissionsCache.next(null);
  }
}