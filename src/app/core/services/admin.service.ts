import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminStats,
  UserManagementData,
  PendingWordsData,
  CommunitiesData,
  RecentActivity,
  ContributorDashboard,
  AdminDashboard,
  SuperAdminDashboard,
  UserRole,
  AdminUser,
} from '../models/admin';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly API_URL = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // === DASHBOARD ===
  getDashboard(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.API_URL}/dashboard`);
  }

  getContributorDashboard(): Observable<ContributorDashboard> {
    return this.http.get<ContributorDashboard>(
      `${this.API_URL}/dashboard/contributor`
    );
  }

  getAdminDashboard(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.API_URL}/dashboard/admin`);
  }

  getSuperAdminDashboard(): Observable<SuperAdminDashboard> {
    return this.http.get<SuperAdminDashboard>(
      `${this.API_URL}/dashboard/superadmin`
    );
  }

  // === GESTION DES UTILISATEURS ===
  getUsers(
    page = 1,
    limit = 20,
    role?: UserRole,
    status?: 'active' | 'suspended' | 'all',
    search?: string
  ): Observable<UserManagementData> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (role) params = params.set('role', role);
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);

    return this.http.get<UserManagementData>(`${this.API_URL}/users`, {
      params,
    });
  }

  toggleUserSuspension(
    userId: string,
    suspend: boolean,
    reason?: string,
    suspendUntil?: Date
  ): Observable<{ success: boolean; message: string }> {
    const body: any = { suspend };
    if (reason) body.reason = reason;
    if (suspendUntil) body.suspendUntil = suspendUntil;

    return this.http.patch<{ success: boolean; message: string }>(
      `${this.API_URL}/users/${userId}/suspension`,
      body
    );
  }

  changeUserRole(
    userId: string,
    role: UserRole
  ): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(
      `${this.API_URL}/users/${userId}/role`,
      { role }
    );
  }

  // === MODÉRATION DES MOTS ===
  getPendingWords(
    page = 1,
    limit = 20,
    language?: string
  ): Observable<PendingWordsData> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (language) params = params.set('language', language);

    return this.http.get<PendingWordsData>(`${this.API_URL}/words/pending`, {
      params,
    });
  }

  moderateWord(
    wordId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Observable<{ success: boolean; message: string }> {
    const body: any = { action };
    if (reason) body.reason = reason;

    return this.http.patch<{ success: boolean; message: string }>(
      `${this.API_URL}/words/${wordId}/moderate`,
      body
    );
  }

  // === GESTION DES COMMUNAUTÉS ===
  getCommunities(
    page = 1,
    limit = 20,
    status?: 'active' | 'inactive'
  ): Observable<CommunitiesData> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) params = params.set('status', status);

    return this.http.get<CommunitiesData>(`${this.API_URL}/communities`, {
      params,
    });
  }

  deleteCommunity(
    communityId: string
  ): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.API_URL}/communities/${communityId}`
    );
  }

  // === ACTIVITÉ ET LOGS ===
  getRecentActivity(limit = 50): Observable<RecentActivity> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RecentActivity>(`${this.API_URL}/activity`, {
      params,
    });
  }
}
