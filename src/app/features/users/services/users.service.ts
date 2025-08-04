import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { User } from '../../../core/models/user';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { LoggerService } from '../../../core/services/logger.service';
import {
  UserProfileResponse,
  UpdateProfileDto,
  UserStatsExtended,
  UserContribution,
  UserConsultation,
  OnlineContributorsStats,
  UserSearchResponse,
  UserSearchParams,
  AvatarUploadResponse
} from '../models/user-extended';
import { 
  isProfilePublic, 
  isEmailVerified, 
  safeBooleanValue 
} from '../utils/user-type-guards';
import { 
  normalizeUserOperator, 
  normalizeUsersOperator, 
  normalizeUserProfileOperator 
} from '../utils/response-normalizer';

/**
 * Service complet de gestion des utilisateurs O'Ypunu
 * 
 * Ce service couvre l'ensemble des fonctionnalités utilisateur :
 * - Gestion de profil (lecture, mise à jour, avatar)
 * - Recherche et découverte d'utilisateurs
 * - Statistiques et analytics
 * - Contributions et consultations récentes
 * - Données en temps réel des contributeurs
 * 
 * @class UsersService
 * @version 2.0.0
 */
@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  // ===== GESTION DE PROFIL =====

  /**
   * Récupérer le profil complet de l'utilisateur connecté
   */
  getProfile(): Observable<UserProfileResponse> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    this.logger.debug('🔍 UsersService: Récupération du profil utilisateur');
    
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/profile`).pipe(
      normalizeUserProfileOperator(),
      tap((profile) => {
        this.logger.debug('✅ UsersService: Profil récupéré:', profile.username);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération profil:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Mettre à jour le profil de l'utilisateur connecté
   */
  updateProfile(profileData: UpdateProfileDto): Observable<UserProfileResponse> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    this.logger.debug('🔄 UsersService: Mise à jour du profil:', profileData);

    return this.http.patch<UserProfileResponse>(`${this.apiUrl}/profile`, profileData).pipe(
      normalizeUserProfileOperator(),
      tap((updatedProfile) => {
        this.logger.debug('✅ UsersService: Profil mis à jour:', updatedProfile.username);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur mise à jour profil:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Upload d'avatar utilisateur
   */
  uploadAvatar(file: File): Observable<AvatarUploadResponse> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const formData = new FormData();
    formData.append('file', file);

    this.logger.debug('📸 UsersService: Upload avatar:', file.name);

    return this.http.post<AvatarUploadResponse>(`${this.apiUrl}/upload-avatar`, formData).pipe(
      tap((response) => {
        this.logger.debug('✅ UsersService: Avatar uploadé:', response.url);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur upload avatar:', error);
        return throwError(() => error);
      })
    );
  }

  // ===== STATISTIQUES ET ANALYTICS =====

  /**
   * Récupérer les statistiques de l'utilisateur connecté
   */
  getUserStats(): Observable<UserStatsExtended> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    this.logger.debug('📊 UsersService: Récupération statistiques utilisateur');

    return this.http.get<UserStatsExtended>(`${this.apiUrl}/profile/stats`).pipe(
      tap((stats) => {
        this.logger.debug('✅ UsersService: Stats récupérées:', stats);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération stats:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer les contributions récentes de l'utilisateur
   */
  getRecentContributions(limit: number = 5): Observable<{contributions: UserContribution[], count: number, timestamp: string}> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const params = new HttpParams().set('limit', limit.toString());

    this.logger.debug('📝 UsersService: Récupération contributions récentes, limit:', limit);

    return this.http.get<{contributions: UserContribution[], count: number, timestamp: string}>(
      `${this.apiUrl}/profile/recent-contributions`, 
      { params }
    ).pipe(
      tap((response) => {
        this.logger.debug('✅ UsersService: Contributions récupérées:', response.count);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération contributions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer les consultations récentes de l'utilisateur
   */
  getRecentConsultations(limit: number = 5): Observable<{consultations: UserConsultation[], count: number, timestamp: string}> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    const params = new HttpParams().set('limit', limit.toString());

    this.logger.debug('👀 UsersService: Récupération consultations récentes, limit:', limit);

    return this.http.get<{consultations: UserConsultation[], count: number, timestamp: string}>(
      `${this.apiUrl}/profile/recent-consultations`, 
      { params }
    ).pipe(
      tap((response) => {
        this.logger.debug('✅ UsersService: Consultations récupérées:', response.count);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération consultations:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer les analytics des contributeurs en ligne (endpoint public)
   */
  getOnlineContributorsStats(): Observable<OnlineContributorsStats> {
    this.logger.debug('📈 UsersService: Récupération stats contributeurs en ligne');

    return this.http.get<OnlineContributorsStats>(`${this.apiUrl}/analytics/online-contributors`).pipe(
      tap((stats) => {
        this.logger.debug('✅ UsersService: Stats contributeurs récupérées:', stats);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération stats contributeurs:', error);
        return throwError(() => error);
      })
    );
  }

  // ===== RECHERCHE ET DÉCOUVERTE =====

  /**
   * Rechercher des utilisateurs avec paramètres avancés
   */
  searchUsers(searchParams: UserSearchParams | string): Observable<User[]> {
    if (!this.authService.isAuthenticated()) {
      return throwError(() => new Error('Utilisateur non authentifié'));
    }

    // Compatibilité avec l'ancienne signature
    let params: HttpParams;
    if (typeof searchParams === 'string') {
      params = new HttpParams().set('search', searchParams);
      this.logger.debug('🔍 UsersService: Recherche simple:', searchParams);
    } else {
      params = new HttpParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
      this.logger.debug('🔍 UsersService: Recherche avancée:', searchParams);
    }

    return this.http.get<User[]>(`${this.apiUrl}/search`, { params }).pipe(
      normalizeUsersOperator(),
      tap((users) => {
        this.logger.debug('✅ UsersService: Utilisateurs trouvés:', users.length);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur recherche utilisateurs:', error);
        return of([]); // Retourner un tableau vide en cas d'erreur
      })
    );
  }

  /**
   * Récupérer un utilisateur par son ID
   */
  getUserById(id: string): Observable<User> {
    this.logger.debug('🔍 UsersService: Récupération utilisateur par ID:', id);

    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      normalizeUserOperator(),
      tap((user) => {
        this.logger.debug('✅ UsersService: Utilisateur récupéré:', user.username);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération utilisateur par ID:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Récupérer un utilisateur par son nom d'utilisateur (profil public)
   */
  getUserByUsername(username: string): Observable<User> {
    this.logger.debug('🔍 UsersService: Récupération utilisateur par username:', username);

    return this.http.get<User>(`${this.apiUrl}/${username}`).pipe(
      normalizeUserOperator(),
      tap((user) => {
        this.logger.debug('✅ UsersService: Utilisateur récupéré:', user.username);
      }),
      catchError((error) => {
        this.logger.error('❌ UsersService: Erreur récupération utilisateur par username:', error);
        return throwError(() => error);
      })
    );
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Vérifier si l'utilisateur actuel peut voir le profil d'un autre utilisateur
   */
  canViewProfile(user: User): boolean {
    if (!user) return false;
    
    // Les profils publics sont toujours visibles
    if (isProfilePublic(user)) return true;
    
    // L'utilisateur peut toujours voir son propre profil
    const currentUser = this.authService.getCurrentUser();
    return !!(currentUser && currentUser.id === user.id);
  }

  /**
   * Formater le nom d'affichage d'un utilisateur
   */
  getDisplayName(user: User): string {
    return user.username || 'Utilisateur';
  }

  /**
   * Obtenir l'URL de l'avatar avec fallback
   */
  getAvatarUrl(user: User): string {
    if (user.profilePicture) {
      return user.profilePicture;
    }
    
    // Fallback vers un avatar par défaut basé sur l'initiale
    const initial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
    return `https://ui-avatars.com/api/?name=${initial}&background=random&color=fff&size=128`;
  }

  /**
   * Calculer le statut d'activité d'un utilisateur
   */
  getActivityStatus(user: User): 'online' | 'recent' | 'away' | 'offline' {
    if (!user.lastActive) return 'offline';
    
    const now = new Date();
    const lastActive = new Date(user.lastActive);
    const diffMinutes = (now.getTime() - lastActive.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'recent';
    if (diffMinutes < 1440) return 'away'; // 24h
    return 'offline';
  }

  /**
   * Vérifier si un utilisateur est contributeur
   */
  isContributor(user: User): boolean {
    if (!user) return false;
    
    const contributorRoles = ['contributor', 'admin', 'superadmin'];
    return contributorRoles.includes(user.role || '');
  }
}
