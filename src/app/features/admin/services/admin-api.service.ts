/**
 * @fileoverview Service API Admin - Intégration des 28 routes admin du backend
 * 
 * Service principal pour toutes les interactions avec l'API d'administration.
 * Respecte les principes SOLID avec séparation claire des responsabilités.
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
  User,
  UserRole,
  UserSuspension,
  UserRoleChange,
  UserFilters,
  PendingWord,
  PendingWordFilters,
  ModerationAction,
  Community,
  CommunityFilters,
  SystemActivity,
  ActivityFilters,
  DashboardStats,
  ContributorDashboard,
  AdminDashboard,
  SuperAdminDashboard,
  WordRevision,
  RevisionStatistics,
  PaginatedResponse,
  ApiResponse,
  TimePeriod,
  ExportFormat,
  ExportType
} from '../models/admin.models';

/**
 * Service API Admin - Single Responsibility Principle
 * 
 * Ce service se concentre uniquement sur les appels API d'administration.
 * Il ne contient aucune logique métier, seulement les interactions HTTP.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly baseUrl = `${environment.apiUrl}/admin`;
  private readonly retryCount = 2;

  constructor(private readonly http: HttpClient) {}

  // ===== DASHBOARD ENDPOINTS =====

  /**
   * Récupère les statistiques du tableau de bord administrateur
   * GET /admin/dashboard
   */
  getDashboard(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.baseUrl}/dashboard`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le tableau de bord spécialisé pour les contributeurs
   * GET /admin/dashboard/contributor
   */
  getContributorDashboard(): Observable<ContributorDashboard> {
    return this.http.get<ApiResponse<ContributorDashboard>>(`${this.baseUrl}/dashboard/contributor`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le tableau de bord spécialisé pour les administrateurs
   * GET /admin/dashboard/admin
   */
  getAdminDashboard(): Observable<AdminDashboard> {
    return this.http.get<ApiResponse<AdminDashboard>>(`${this.baseUrl}/dashboard/admin`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le tableau de bord spécialisé pour les superadministrateurs
   * GET /admin/dashboard/superadmin
   */
  getSuperAdminDashboard(): Observable<SuperAdminDashboard> {
    return this.http.get<ApiResponse<SuperAdminDashboard>>(`${this.baseUrl}/dashboard/superadmin`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== USER MANAGEMENT ENDPOINTS =====

  /**
   * Récupère la liste paginée des utilisateurs avec filtres
   * GET /admin/users
   */
  getUsers(
    page: number = 1,
    limit: number = 20,
    filters?: UserFilters
  ): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.role) {
      params = params.set('role', filters.role);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<PaginatedResponse<User>>(`${this.baseUrl}/users`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Suspend ou reactive un compte utilisateur
   * PATCH /admin/users/:id/suspension
   */
  toggleUserSuspension(userId: string, suspensionData: UserSuspension): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/${userId}/suspension`, suspensionData)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Modifie le rôle d'un utilisateur (superadmin uniquement)
   * PATCH /admin/users/:id/role
   */
  changeUserRole(userId: string, roleChange: UserRoleChange): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/${userId}/role`, roleChange)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== WORD MODERATION ENDPOINTS =====

  /**
   * Récupère les mots en attente de modération
   * GET /admin/words/pending
   */
  getPendingWords(
    page: number = 1,
    limit: number = 20,
    filters?: PendingWordFilters
  ): Observable<PaginatedResponse<PendingWord>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.language) {
      params = params.set('language', filters.language);
    }

    return this.http.get<PaginatedResponse<PendingWord>>(`${this.baseUrl}/words/pending`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Modère un mot en attente (approbation ou rejet)
   * PATCH /admin/words/:id/moderate
   */
  moderateWord(wordId: string, action: ModerationAction): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/words/${wordId}/moderate`, action)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== COMMUNITY MANAGEMENT ENDPOINTS =====

  /**
   * Récupère la liste des communautés avec filtres
   * GET /admin/communities
   */
  getCommunities(
    page: number = 1,
    limit: number = 20,
    filters?: CommunityFilters
  ): Observable<PaginatedResponse<Community>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<PaginatedResponse<Community>>(`${this.baseUrl}/communities`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime une communauté de la plateforme
   * DELETE /admin/communities/:id
   */
  deleteCommunity(communityId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/communities/${communityId}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== ACTIVITY & LOGS ENDPOINTS =====

  /**
   * Récupère l'activité récente de la plateforme
   * GET /admin/activity
   */
  getRecentActivity(limit: number = 50): Observable<SystemActivity[]> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<ApiResponse<SystemActivity[]>>(`${this.baseUrl}/activity`, { params })
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== ANALYTICS ENDPOINTS =====

  /**
   * Récupère les analytics détaillées des utilisateurs
   * GET /admin/analytics/users
   */
  getUserAnalytics(period: TimePeriod = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/users`, { params })
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les analytics détaillées du contenu
   * GET /admin/analytics/content
   */
  getContentAnalytics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/content`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les analytics détaillées des communautés
   * GET /admin/analytics/communities
   */
  getCommunityAnalytics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/communities`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les métriques système
   * GET /admin/analytics/system
   */
  getSystemMetrics(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/system`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère une vue d'ensemble complète des analytics
   * GET /admin/analytics/overview
   */
  getAnalyticsOverview(period: TimePeriod = '30d'): Observable<any> {
    const params = new HttpParams().set('period', period);

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analytics/overview`, { params })
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== REPORTS ENDPOINTS =====

  /**
   * Exporte un rapport détaillé
   * GET /admin/reports/export
   */
  exportReport(
    type: ExportType,
    format: ExportFormat = 'json',
    period: TimePeriod = '30d'
  ): Observable<any> {
    const params = new HttpParams()
      .set('type', type)
      .set('format', format)
      .set('period', period);

    return this.http.get<any>(`${this.baseUrl}/reports/export`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== PERMISSION VERIFICATION ENDPOINTS =====

  /**
   * Vérifie si un utilisateur est modérateur d'une communauté spécifique
   * GET /admin/permissions/community/:communityId/moderator/:userId
   */
  checkCommunityModerator(communityId: string, userId?: string): Observable<{ isModerator: boolean; permissions?: string[] }> {
    const url = userId 
      ? `${this.baseUrl}/permissions/community/${communityId}/moderator/${userId}`
      : `${this.baseUrl}/permissions/community/${communityId}/moderator`;

    return this.http.get<ApiResponse<{ isModerator: boolean; permissions?: string[] }>>(url)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Vérifie si un utilisateur est l'auteur d'un contenu spécifique
   * GET /admin/permissions/content/:contentId/author/:userId
   */
  checkContentAuthor(contentId: string, userId?: string): Observable<{ isAuthor: boolean; authorId?: string }> {
    const url = userId 
      ? `${this.baseUrl}/permissions/content/${contentId}/author/${userId}`
      : `${this.baseUrl}/permissions/content/${contentId}/author`;

    return this.http.get<ApiResponse<{ isAuthor: boolean; authorId?: string }>>(url)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère les informations de rôle d'un utilisateur spécifique
   * GET /admin/permissions/user/:userId/role
   */
  getUserRole(userId: string): Observable<{ role: UserRole; canManage: boolean }> {
    return this.http.get<ApiResponse<{ role: UserRole; canManage: boolean }>>(
      `${this.baseUrl}/permissions/user/${userId}/role`
    ).pipe(
      map(response => response.data!),
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les permissions contextuelles d'un utilisateur
   * GET /admin/permissions/user/:userId/contextual
   */
  getUserContextualPermissions(userId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/permissions/user/${userId}/contextual`)
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== REVISION MANAGEMENT ENDPOINTS =====

  /**
   * Récupère les révisions en attente de modération
   * GET /admin/revisions/pending
   */
  getPendingRevisions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    userId?: string
  ): Observable<PaginatedResponse<WordRevision>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }
    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http.get<PaginatedResponse<WordRevision>>(`${this.baseUrl}/revisions/pending`, { params })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Approuve une révision spécifique d'un mot
   * PATCH /admin/revisions/:wordId/:revisionId/approve
   */
  approveRevision(wordId: string, revisionId: string, notes?: string): Observable<ApiResponse> {
    const body = { notes };

    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/revisions/${wordId}/${revisionId}/approve`,
      body
    ).pipe(
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Rejette une révision spécifique d'un mot
   * PATCH /admin/revisions/:wordId/:revisionId/reject
   */
  rejectRevision(wordId: string, revisionId: string, reason?: string): Observable<ApiResponse> {
    const body = { reason };

    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/revisions/${wordId}/${revisionId}/reject`,
      body
    ).pipe(
      retry(this.retryCount),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les statistiques détaillées des révisions
   * GET /admin/revisions/statistics
   */
  getRevisionStatistics(
    period: 'week' | 'month' | 'year' = 'month',
    userId?: string
  ): Observable<RevisionStatistics> {
    let params = new HttpParams().set('period', period);

    if (userId) {
      params = params.set('userId', userId);
    }

    return this.http.get<ApiResponse<RevisionStatistics>>(`${this.baseUrl}/revisions/statistics`, { params })
      .pipe(
        map(response => response.data!),
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  // ===== MÉTHODES UTILITAIRES PRIVÉES =====

  /**
   * Gestion centralisée des erreurs HTTP
   * Respecte le principe DRY (Don't Repeat Yourself)
   */
  private handleError = (error: any): Observable<never> => {
    console.error('AdminApiService Error:', error);
    
    let errorMessage = 'Une erreur inconnue s\'est produite';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = error.error?.message || `Erreur serveur: ${error.status} ${error.statusText}`;
    }
    
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Construit les paramètres HTTP de manière type-safe
   */
  private buildHttpParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    
    return httpParams;
  }

  /**
   * Vérifie si une réponse API est valide
   */
  private isValidApiResponse<T>(response: ApiResponse<T>): boolean {
    return response && typeof response.success === 'boolean' && response.data !== undefined;
  }

  // ===== MÉTHODES API MANQUANTES (STUBS TEMPORAIRES) =====

  /**
   * Suspend un utilisateur
   */
  suspendUser(userId: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/${userId}/suspend`, {})
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Réactive un utilisateur
   */
  reactivateUser(userId: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/${userId}/reactivate`, {})
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour le rôle d'un utilisateur
   */
  updateUserRole(userId: string, role: any): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/${userId}/role`, { role })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime un utilisateur
   */
  deleteUser(userId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/users/${userId}`)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Suspend plusieurs utilisateurs
   */
  bulkSuspendUsers(userIds: string[]): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/bulk/suspend`, { userIds })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Réactive plusieurs utilisateurs
   */
  bulkReactivateUsers(userIds: string[]): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/bulk/reactivate`, { userIds })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Supprime plusieurs utilisateurs
   */
  bulkDeleteUsers(userIds: string[]): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/users/bulk`, { body: { userIds } })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Exporte des utilisateurs
   */
  exportUsers(userIds?: string[]): Observable<string> {
    const body = userIds ? { userIds } : {};
    return this.http.post(`${this.baseUrl}/users/export`, body, { responseType: 'text' })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Exporte des mots
   */
  exportWords(wordIds?: string[]): Observable<string> {
    const body = wordIds ? { wordIds } : {};
    return this.http.post(`${this.baseUrl}/words/export`, body, { responseType: 'text' })
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }

  /**
   * Actions de modération en lot
   */
  bulkModerateWords(wordIds: string[], status: any, reason?: string): Observable<ApiResponse> {
    const body = { wordIds, status, reason };
    return this.http.patch<ApiResponse>(`${this.baseUrl}/words/bulk/moderate`, body)
      .pipe(
        retry(this.retryCount),
        catchError(this.handleError)
      );
  }
}