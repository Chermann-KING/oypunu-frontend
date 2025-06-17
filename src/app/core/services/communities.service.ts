import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Community } from '../models/community';
import {
  BehaviorSubject,
  catchError,
  Observable,
  of,
  tap,
  throwError,
} from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';

export interface CommunityMember {
  _id: string;
  communityId: string;
  userId: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
}

export interface CommunityFilters {
  searchTerm?: string;
  language?: string;
  tag?: string;
  includePrivate?: boolean;
  sortBy?: 'name' | 'memberCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CommunitiesService {
  private readonly _API_URL = `${environment.apiUrl}/communities`;
  private _userCommunities = new BehaviorSubject<Community[]>([]);
  userCommunities$ = this._userCommunities.asObservable();

  constructor(private _http: HttpClient, private _authService: AuthService) {
    this._loadUserCommunities();

    // Recharger les communautés quand l'utilisateur change
    this._authService.currentUser$.subscribe((user) => {
      if (user) {
        this._loadUserCommunities();
      } else {
        this._userCommunities.next([]);
      }
    });
  }

  // Créer une communauté
  create(communityData: Partial<Community>): Observable<Community> {
    return this._http.post<Community>(`${this._API_URL}`, communityData).pipe(
      tap((newCommunity) => {
        const current = this._userCommunities.value;
        this._userCommunities.next([...current, newCommunity]);
      })
    );
  }

  // Récupérer toutes les communautés
  getAll(filters: CommunityFilters = {}): Observable<{
    communities: Community[];
    total: number;
    page: number;
    limit: number;
  }> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params = params.append(key, value.toString());
      }
    });

    return this._http.get<{
      communities: Community[];
      total: number;
      page: number;
      limit: number;
    }>(`${this._API_URL}`, { params });
  }

  // Récupérer une communauté par son ID
  getOne(communityId: string): Observable<Community> {
    return this._http.get<Community>(`${this._API_URL}/${communityId}`);
  }

  // Mettre à jour une communauté
  update(
    communityId: string,
    updateData: Partial<Community>
  ): Observable<{ success: boolean; message: string }> {
    return this._http.patch<{ success: boolean; message: string }>(
      `${this._API_URL}/${communityId}`,
      updateData
    );
  }

  // Supprimer une communauté
  delete(
    communityId: string
  ): Observable<{ success: boolean; message: string }> {
    return this._http.delete<{ success: boolean; message: string }>(
      `${this._API_URL}/${communityId}`
    );
  }

  // Rejoindre une communauté
  join(communityId: string): Observable<{ success: boolean }> {
    return this._http
      .post<{ success: boolean }>(`${this._API_URL}/${communityId}/join`, {})
      .pipe(tap(() => this._loadUserCommunities()));
  }

  // Quitter une communauté
  leave(communityId: string): Observable<{ success: boolean }> {
    return this._http
      .post<{ success: boolean }>(`${this._API_URL}/${communityId}/leave`, {})
      .pipe(tap(() => this._loadUserCommunities()));
  }

  // Récupérer les membres d'une communauté
  getMembers(
    communityId: string,
    page = 1,
    limit = 10
  ): Observable<{
    members: CommunityMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this._http.get<{
      members: CommunityMember[];
      total: number;
      page: number;
      limit: number;
    }>(`${this._API_URL}/${communityId}/members`, {
      params: new HttpParams()
        .append('page', page.toString())
        .append('limit', limit.toString()),
    });
  }

  // Changer le rôle d'un membre
  updateMemberRole(
    communityId: string,
    userId: string,
    newRole: 'admin' | 'moderator' | 'member'
  ): Observable<{ success: boolean; message: string }> {
    return this._http.patch<{ success: boolean; message: string }>(
      `${this._API_URL}/${communityId}/members/${userId}/role`,
      { role: newRole }
    );
  }

  // Récupérer les communautés d'un utilisateur
  getUserCommunities(
    page = 1,
    limit = 10
  ): Observable<{
    communities: Community[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this._http.get<{
      communities: Community[];
      total: number;
      page: number;
      limit: number;
    }>(`${this._API_URL}/user`, {
      params: new HttpParams()
        .append('page', page.toString())
        .append('limit', limit.toString()),
    });
  }

  // Vérifier si un utilisateur est membre d'une communauté
  isMember(communityId: string): Observable<boolean> {
    return this._http.get<boolean>(`${this._API_URL}/${communityId}/is-member`);
  }

  // Récupérer le rôle d'un membre dans une communauté
  getMemberRole(
    communityId: string
  ): Observable<'admin' | 'moderator' | 'member' | null> {
    return this._http
      .get<'admin' | 'moderator' | 'member' | null>(
        `${this._API_URL}/${communityId}/role`
      )
      .pipe(
        catchError((error) => {
          console.log('Erreur getMemberRole:', error);
          // Si la réponse est ok: false mais status: 200, considérer comme null
          if (error.status === 200) {
            return of(null);
          }
          // Sinon propager l'erreur
          return throwError(() => error);
        })
      );
  }

  // Rechercher des communautés par tags
  searchByTags(
    tags: string[],
    page = 1,
    limit = 10
  ): Observable<{
    communities: Community[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this._http.get<{
      communities: Community[];
      total: number;
      page: number;
      limit: number;
    }>(`${this._API_URL}/search/tags`, {
      params: new HttpParams()
        .append('tags', tags.join(','))
        .append('page', page.toString())
        .append('limit', limit.toString()),
    });
  }

  private _loadUserCommunities(): void {
    if (!this._authService.isAuthenticated()) return;

    this._http
      .get<{ communities: Community[] }>(`${this._API_URL}/me/communities`)
      .subscribe({
        next: (response) => this._userCommunities.next(response.communities),
        error: (error) =>
          console.error('Error loading user communities:', error),
      });
  }
}
