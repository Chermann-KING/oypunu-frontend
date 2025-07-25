import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { timeout, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Language {
  _id: string;
  name: string;
  nativeName: string;
  iso639_1?: string;
  iso639_2?: string;
  iso639_3?: string;
  region: string;
  countries: string[];
  alternativeNames?: string[];
  speakerCount?: number;
  description?: string;
  endangermentStatus?: 'endangered' | 'vulnerable' | 'safe' | 'unknown';
  status?: 'major' | 'regional' | 'local' | 'liturgical' | 'extinct';
  systemStatus: 'pending' | 'active' | 'rejected';
  isVisible: boolean;
  isAfricanLanguage: boolean;
  isFeatured: boolean;
  proposedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  wikipediaUrl?: string;
  ethnologueUrl?: string;
  sortOrder?: number;
}

export interface CreateLanguageDto {
  name: string;
  nativeName: string;
  iso639_1?: string;
  iso639_2?: string;
  iso639_3?: string;
  region: string;
  countries: string[];
  alternativeNames?: string[];
  status?: 'major' | 'regional' | 'local' | 'liturgical' | 'extinct';
  speakerCount?: number;
  endangermentStatus?: 'endangered' | 'vulnerable' | 'safe' | 'unknown';
  description?: string;
  wikipediaUrl?: string;
  ethnologueUrl?: string;
}

export interface LanguageStats {
  byStatus: Array<{ status: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
  totalActive: number;
  totalPending: number;
}

export interface MigrationReport {
  languages: {
    total: number;
    active: number;
    pending: number;
  };
  words: {
    total: number;
    migrated: number;
    percentage: number;
  };
  users: {
    total: number;
    migrated: number;
    percentage: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LanguagesService {
  private readonly baseUrl = `${environment.apiUrl}/languages`;

  constructor(private http: HttpClient) {}

  // ===== ENDPOINTS PUBLICS =====

  /**
   * Récupère toutes les langues actives
   */
  getActiveLanguages(region?: string, featured?: boolean): Observable<Language[]> {
    let params = new HttpParams();
    if (region) params = params.set('region', region);
    if (featured !== undefined) params = params.set('featured', featured.toString());

    return this.http.get<Language[]>(this.baseUrl, { params });
  }

  /**
   * Récupère les langues africaines prioritaires
   */
  getAfricanLanguages(): Observable<Language[]> {
    return this.http.get<Language[]>(`${this.baseUrl}/african`);
  }

  /**
   * Récupère les langues populaires (avec le plus de mots)
   */
  getPopularLanguages(limit: number = 10): Observable<Language[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Language[]>(`${this.baseUrl}/popular`, { params });
  }

  /**
   * Recherche des langues
   */
  searchLanguages(query: string): Observable<Language[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Language[]>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Récupère les statistiques des langues
   */
  getLanguageStats(): Observable<LanguageStats> {
    return this.http.get<LanguageStats>(`${this.baseUrl}/stats`);
  }

  /**
   * Récupère une langue par son ID
   */
  getLanguageById(id: string): Observable<Language> {
    return this.http.get<Language>(`${this.baseUrl}/${id}`);
  }

  // ===== ENDPOINTS UTILISATEURS AUTHENTIFIÉS =====

  /**
   * Propose une nouvelle langue (contributeur+)
   */
  proposeLanguage(languageData: CreateLanguageDto): Observable<Language> {
    console.log('🌐 Service: Envoi de la requête vers', `${this.baseUrl}/propose`);
    console.log('📦 Service: Données envoyées:', languageData);
    
    return this.http.post<Language>(`${this.baseUrl}/propose`, languageData).pipe(
      timeout(30000), // Timeout de 30 secondes pour éviter les blocages
      tap(response => {
        console.log('🎉 Service: Réponse reçue avec succès:', response);
      }),
      catchError(error => {
        console.error('💥 Service: Erreur interceptée:', error);
        console.error('📊 Service: Détails erreur:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        return throwError(() => error);
      })
    );
  }

  // ===== ENDPOINTS ADMINISTRATEURS =====

  /**
   * Récupère les langues en attente d'approbation (admin)
   */
  getPendingLanguages(): Observable<Language[]> {
    return this.http.get<Language[]>(`${this.baseUrl}/admin/pending`);
  }

  /**
   * Approuve une langue proposée (admin)
   */
  approveLanguage(id: string, approvalData: { approvalNotes?: string; isFeatured?: boolean }): Observable<Language> {
    return this.http.post<Language>(`${this.baseUrl}/${id}/approve`, approvalData);
  }

  /**
   * Rejette une langue proposée (admin)
   */
  rejectLanguage(id: string, rejectionData: { rejectionReason: string; suggestions?: string }): Observable<Language> {
    return this.http.post<Language>(`${this.baseUrl}/${id}/reject`, rejectionData);
  }

  // ===== ENDPOINTS DE MIGRATION (SUPERADMIN) =====

  /**
   * Lance le seeding des langues africaines (superadmin)
   */
  seedAfricanLanguages(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/migration/seed`, {});
  }

  /**
   * Migre les mots vers les IDs de langue (superadmin)
   */
  migrateWords(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/migration/migrate-words`, {});
  }

  /**
   * Migre les utilisateurs vers les IDs de langue (superadmin)
   */
  migrateUsers(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/migration/migrate-users`, {});
  }

  /**
   * Met à jour les statistiques des langues (superadmin)
   */
  updateLanguageStats(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/migration/update-stats`, {});
  }

  /**
   * Lance la migration complète (superadmin)
   */
  runFullMigration(): Observable<{ message: string; report: MigrationReport }> {
    return this.http.post<{ message: string; report: MigrationReport }>(`${this.baseUrl}/migration/full`, {});
  }

  /**
   * Récupère le rapport de migration (admin)
   */
  getMigrationReport(): Observable<MigrationReport> {
    return this.http.get<MigrationReport>(`${this.baseUrl}/migration/report`);
  }

  /**
   * Nettoie les anciens champs de langue (superadmin)
   */
  cleanupOldLanguageFields(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/migration/cleanup`);
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Formate le nombre de locuteurs pour l'affichage
   */
  formatSpeakerCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  }

  /**
   * Retourne l'emoji du statut d'endangement
   */
  getEndangermentIcon(status: string): string {
    switch (status) {
      case 'safe': return '✅';
      case 'vulnerable': return '⚠️';
      case 'endangered': return '🚨';
      default: return '❓';
    }
  }

  /**
   * Retourne le libellé du statut d'endangement
   */
  getEndangermentLabel(status: string): string {
    switch (status) {
      case 'safe': return 'Sûre';
      case 'vulnerable': return 'Vulnérable';
      case 'endangered': return 'En danger';
      default: return 'Inconnu';
    }
  }

  /**
   * Retourne le libellé du statut de langue
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'major': return 'Majeure';
      case 'regional': return 'Régionale';
      case 'local': return 'Locale';
      case 'liturgical': return 'Liturgique';
      case 'extinct': return 'Éteinte';
      default: return 'Inconnue';
    }
  }

  /**
   * Vérifie si l'utilisateur peut gérer les langues
   */
  canManageLanguages(userRole: string): boolean {
    return ['contributor', 'admin', 'superadmin'].includes(userRole);
  }

  /**
   * Vérifie si l'utilisateur peut approuver les langues
   */
  canApproveLanguages(userRole: string): boolean {
    return ['admin', 'superadmin'].includes(userRole);
  }

  /**
   * Vérifie si l'utilisateur peut faire la migration
   */
  canRunMigration(userRole: string): boolean {
    return userRole === 'superadmin';
  }
}