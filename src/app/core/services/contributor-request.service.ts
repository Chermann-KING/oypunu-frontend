import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ContributorRequest,
  ContributorRequestFilters,
  ContributorRequestListResponse,
  ContributorRequestStats,
  CreateContributorRequestDto,
  ReviewContributorRequestDto,
  UpdateContributorRequestPriorityDto,
  BulkActionDto,
  ContributorRequestStatus,
} from '../models/contributor-request';

@Injectable({
  providedIn: 'root'
})
export class ContributorRequestService {
  private readonly apiUrl = `${environment.apiUrl}/contributor-requests`;
  private readonly adminApiUrl = `${environment.apiUrl}/admin`;

  // État local pour le cache et les notifications
  private _pendingRequestsCount = new BehaviorSubject<number>(0);
  private _lastRefresh = new BehaviorSubject<Date | null>(null);
  private _filters = new BehaviorSubject<ContributorRequestFilters>({});

  // Observables publiques
  public pendingRequestsCount$ = this._pendingRequestsCount.asObservable();
  public lastRefresh$ = this._lastRefresh.asObservable();
  public filters$ = this._filters.asObservable();

  constructor(private http: HttpClient) {
    this.loadPendingCount();
  }

  // === MÉTHODES POUR LES UTILISATEURS ===

  /**
   * Créer une nouvelle demande de contribution
   */
  createRequest(requestData: CreateContributorRequestDto): Observable<ContributorRequest> {
    return this.http.post<ContributorRequest>(this.apiUrl, requestData);
  }

  /**
   * Récupérer mes demandes de contribution
   */
  getMyRequests(): Observable<ContributorRequest[]> {
    return this.http.get<ContributorRequest[]>(`${this.apiUrl}/my-requests`);
  }

  // === MÉTHODES POUR L'ADMINISTRATION ===

  /**
   * Récupérer la liste des demandes avec filtres et pagination
   */
  getRequests(
    page: number = 1,
    limit: number = 20,
    filters: ContributorRequestFilters = {}
  ): Observable<ContributorRequestListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Ajouter les filtres
    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ContributorRequestListResponse>(this.apiUrl, { params })
      .pipe(
        map(response => {
          // Mettre à jour le cache
          this._pendingRequestsCount.next(response.statistics.pending);
          this._lastRefresh.next(new Date());
          return response;
        })
      );
  }

  /**
   * Récupérer les statistiques des demandes
   */
  getStatistics(): Observable<ContributorRequestStats> {
    return this.http.get<ContributorRequestStats>(`${this.apiUrl}/statistics`);
  }

  /**
   * Récupérer une demande spécifique
   */
  getRequestById(requestId: string): Observable<ContributorRequest> {
    return this.http.get<ContributorRequest>(`${this.apiUrl}/${requestId}`);
  }

  /**
   * Réviser une demande (approuver/rejeter/etc.)
   */
  reviewRequest(
    requestId: string,
    reviewData: ReviewContributorRequestDto
  ): Observable<ContributorRequest> {
    return this.http.patch<ContributorRequest>(
      `${this.apiUrl}/${requestId}/review`,
      reviewData
    ).pipe(
      map(request => {
        // Mettre à jour le cache après révision
        this.loadPendingCount();
        return request;
      })
    );
  }

  /**
   * Mettre à jour la priorité d'une demande
   */
  updatePriority(
    requestId: string,
    priorityData: UpdateContributorRequestPriorityDto
  ): Observable<ContributorRequest> {
    return this.http.patch<ContributorRequest>(
      `${this.apiUrl}/${requestId}/priority`,
      priorityData
    );
  }

  /**
   * Actions en lot sur plusieurs demandes
   */
  bulkAction(bulkData: BulkActionDto): Observable<{ success: number; failed: number; errors: string[] }> {
    return this.http.post<{ success: number; failed: number; errors: string[] }>(
      `${this.apiUrl}/bulk-action`,
      bulkData
    ).pipe(
      map(result => {
        // Mettre à jour le cache après action en lot
        this.loadPendingCount();
        return result;
      })
    );
  }

  /**
   * Nettoyer les demandes expirées (superadmin seulement)
   */
  cleanupExpiredRequests(): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(`${this.apiUrl}/cleanup`);
  }

  // === MÉTHODES POUR LES CONTRIBUTEURS ===

  /**
   * Vue rapide des demandes en attente (pour contributeurs)
   */
  getQuickView(limit: number = 10): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any>(`${this.apiUrl}/pending/quick-view`, { params });
  }

  /**
   * Révision rapide par contributeur (recommandation/signalement)
   */
  quickReview(
    requestId: string,
    action: 'recommend' | 'flag',
    notes?: string
  ): Observable<ContributorRequest> {
    return this.http.patch<ContributorRequest>(
      `${this.apiUrl}/${requestId}/quick-review`,
      { action, notes }
    );
  }

  // === MÉTHODES UTILITAIRES ===

  /**
   * Mettre à jour les filtres
   */
  updateFilters(filters: ContributorRequestFilters): void {
    this._filters.next(filters);
  }

  /**
   * Obtenir les filtres actuels
   */
  getCurrentFilters(): ContributorRequestFilters {
    return this._filters.value;
  }

  /**
   * Charger le nombre de demandes en attente
   */
  private loadPendingCount(): void {
    this.getRequests(1, 1, { status: ContributorRequestStatus.PENDING })
      .subscribe(response => {
        this._pendingRequestsCount.next(response.total);
      });
  }

  /**
   * Actualiser le cache
   */
  refreshCache(): void {
    this.loadPendingCount();
    this._lastRefresh.next(new Date());
  }

  /**
   * Vérifier s'il y a de nouvelles demandes
   */
  checkForNewRequests(): Observable<boolean> {
    return this.getRequests(1, 1).pipe(
      map(response => {
        const currentCount = this._pendingRequestsCount.value;
        const newCount = response.statistics.pending;
        
        if (newCount > currentCount) {
          this._pendingRequestsCount.next(newCount);
          return true;
        }
        return false;
      })
    );
  }

  /**
   * Marquer les notifications comme lues
   */
  markNotificationsAsRead(): void {
    // Cette méthode peut être étendue pour gérer les notifications
    // côté serveur si nécessaire
  }

  /**
   * Obtenir les statistiques pour le dashboard
   */
  getDashboardStats(): Observable<{
    pending: number;
    approved: number;
    rejected: number;
    underReview: number;
    total: number;
    avgProcessingDays: number;
    approvalRate: number;
  }> {
    return this.getRequests(1, 1).pipe(
      map(response => response.statistics)
    );
  }

  /**
   * Exporter les demandes en CSV
   */
  exportRequests(filters: ContributorRequestFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    params = params.set('export', 'csv');

    return this.http.get(`${this.apiUrl}`, { 
      params, 
      responseType: 'blob' 
    });
  }

  /**
   * Recherche avancée avec suggestions
   */
  searchRequests(query: string): Observable<ContributorRequest[]> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', '10');

    return this.http.get<ContributorRequestListResponse>(this.apiUrl, { params })
      .pipe(
        map(response => response.requests)
      );
  }

  /**
   * Obtenir les métriques de performance
   */
  getPerformanceMetrics(): Observable<{
    averageReviewTime: number;
    reviewerPerformance: Array<{
      reviewerId: string;
      reviewerName: string;
      totalReviews: number;
      averageTime: number;
      approvalRate: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      requests: number;
      approved: number;
      rejected: number;
    }>;
  }> {
    return this.http.get<any>(`${this.apiUrl}/metrics`);
  }

  /**
   * Obtenir les suggestions d'amélioration pour une demande
   */
  getSuggestions(requestId: string): Observable<{
    suggestions: string[];
    improvementAreas: string[];
    similarApprovedRequests: ContributorRequest[];
  }> {
    return this.http.get<any>(`${this.apiUrl}/${requestId}/suggestions`);
  }

  /**
   * Planifier une révision
   */
  scheduleReview(requestId: string, reviewDate: Date, reviewerId?: string): Observable<ContributorRequest> {
    return this.http.patch<ContributorRequest>(
      `${this.apiUrl}/${requestId}/schedule`,
      { reviewDate, reviewerId }
    );
  }

  /**
   * Obtenir l'historique d'activité détaillé
   */
  getActivityHistory(requestId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${requestId}/activity`);
  }
}