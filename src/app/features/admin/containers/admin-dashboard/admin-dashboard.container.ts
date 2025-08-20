/**
 * @fileoverview Container principal du dashboard admin
 *
 * Container intelligent qui orchestre l'affichage du dashboard selon le rôle.
 * Respecte les principes SOLID avec séparation des responsabilités.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, map, catchError, tap, switchMap } from 'rxjs/operators';

import { AdminApiService } from '../../services/admin-api.service';
import { AnalyticsApiService } from '../../services/analytics-api.service';
import { PermissionService } from '../../services/permission.service';
import { AuthService } from '../../../../core/services/auth.service';

import {
  DashboardStats,
  ContributorDashboard,
  AdminDashboard,
  SuperAdminDashboard,
  UserRole,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';
import { DashboardStatsAction } from '../../components/dashboard/dashboard-stats.component';

/**
 * Interface pour l'état du dashboard
 */
interface DashboardState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly dashboardType: 'contributor' | 'admin' | 'superadmin' | 'default';
  readonly data:
    | DashboardStats
    | ContributorDashboard
    | AdminDashboard
    | SuperAdminDashboard
    | null;
}

/**
 * Container Dashboard Admin - Single Responsibility Principle
 *
 * Ce container s'occupe uniquement de l'orchestration du dashboard.
 * Il délègue la logique métier aux services injectés.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.container.html',
  styleUrls: ['./admin-dashboard.container.scss'],
})
export class AdminDashboardContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // Observables pour la gestion d'état reactive
  public readonly dashboardState$: Observable<DashboardState>;
  public readonly currentUser$: Observable<any>;

  private readonly dashboardStateSubject = new Subject<DashboardState>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminApiService: AdminApiService,
    private readonly analyticsApiService: AnalyticsApiService,
    private readonly permissionService: PermissionService,
    private readonly authService: AuthService
  ) {
    // Initialiser l'état par défaut
    this.dashboardStateSubject.next({
      isLoading: true,
      error: null,
      dashboardType: 'default',
      data: null,
    });

    this.dashboardState$ = this.dashboardStateSubject.asObservable();
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    console.log('🔄 AdminDashboardContainer - ngOnInit');
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dashboardStateSubject.complete();
  }

  /**
   * Charge les données du dashboard selon le rôle de l'utilisateur
   */
  private loadDashboard(): void {
    console.log('🔄 AdminDashboardContainer - loadDashboard');
    this.dashboardStateSubject.next({
      isLoading: true,
      error: null,
      dashboardType: 'default',
      data: null,
    });

    combineLatest([this.authService.currentUser$, this.route.data])
      .pipe(
        takeUntil(this.destroy$),
        map(([user, routeData]) => {
          console.log('👤 User from currentUser$:', user);
          console.log('📍 Route data:', routeData);

          if (!user || !user.role) {
            throw new Error('Utilisateur non authentifié ou rôle manquant');
          }

          // Déterminer le type de dashboard selon le rôle et les données de route
          const dashboardType = this.determineDashboardType(
            user.role as UserRole,
            routeData
          );
          console.log('📊 Dashboard type déterminé:', dashboardType);
          return { user, dashboardType };
        }),
        catchError((error) => {
          console.error('❌ Erreur dans loadDashboard:', error);
          this.dashboardStateSubject.next({
            isLoading: false,
            error: error.message || 'Erreur lors du chargement du dashboard',
            dashboardType: 'default',
            data: null,
          });
          return of(null);
        })
      )
      .subscribe((result) => {
        console.log('📤 Result from combineLatest:', result);
        if (result) {
          this.loadDashboardData(result.dashboardType);
        }
      });
  }

  /**
   * Détermine le type de dashboard selon le rôle et les données de route
   */
  private determineDashboardType(
    userRole: UserRole,
    routeData: any
  ): 'contributor' | 'admin' | 'superadmin' | 'default' {
    // Priorité aux données de route si elles spécifient un type
    if (routeData.dashboardType) {
      return routeData.dashboardType;
    }

    // Sinon, utiliser le rôle de l'utilisateur
    switch (userRole) {
      case UserRole.CONTRIBUTOR:
        return 'contributor';
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.SUPERADMIN:
        return 'superadmin';
      default:
        return 'default';
    }
  }

  /**
   * Charge les données spécifiques selon le type de dashboard
   */
  private loadDashboardData(
    dashboardType: 'contributor' | 'admin' | 'superadmin' | 'default'
  ): void {
    console.log('📊 loadDashboardData pour type:', dashboardType);
    let dataObservable: Observable<any>;

    switch (dashboardType) {
      case 'contributor':
        dataObservable = this.adminApiService.getContributorDashboard();
        break;
      case 'admin':
        dataObservable = this.adminApiService.getAdminDashboard();
        break;
      case 'superadmin':
        // Charger les données SuperAdmin + analytics du contenu + statistiques des langues RÉELLES
        // Charger d'abord les données SuperAdmin + content analytics
        const baseDataObservable = combineLatest([
          this.adminApiService.getSuperAdminDashboard(),
          this.adminApiService.getContentAnalytics(),
        ]);

        // Puis essayer de charger les stats des langues séparément
        const languageStatsObservable = this.adminApiService
          .getLanguageStatistics()
          .pipe(
            tap((languageStats) =>
              console.log('📊 Données des langues reçues:', languageStats)
            ),
            catchError((error) => {
              console.error(
                '❌ Erreur lors du chargement des statistiques de langues:',
                error
              );
              // Retourner des données par défaut en cas d'erreur
              return of({
                byStatus: [],
                totalActive: 0,
                totalPending: 0,
              });
            })
          );

        // Charger les stats des catégories séparément
        const categoryStatsObservable = this.adminApiService
          .getCategoryStatistics()
          .pipe(
            tap((categoryStats) =>
              console.log('📂 Données des catégories reçues:', categoryStats)
            ),
            catchError((error) => {
              console.error(
                '❌ Erreur lors du chargement des statistiques de catégories:',
                error
              );
              // Retourner des données par défaut en cas d'erreur
              return of({
                byStatus: [],
                totalActive: 0,
                totalPending: 0,
              });
            })
          );

        dataObservable = combineLatest([
          languageStatsObservable,
          categoryStatsObservable,
        ]).pipe(
          switchMap(([languageStats, categoryStats]) => {
            // Avec les stats des langues et catégories, récupérer les analytics
            return combineLatest([
              baseDataObservable,
              this.adminApiService.getContentAnalytics().pipe(
                catchError(() => of(null)) // Si contentAnalytics échoue, on continue avec null
              ),
            ]).pipe(
              map(([[superAdminData, contentAnalytics], _]) => {
                console.log('📊 Données combinées reçues:');
                console.log('- SuperAdmin:', superAdminData);
                console.log('- Content Analytics:', contentAnalytics);
                console.log('- Language Stats:', languageStats);
                console.log('- Category Stats:', categoryStats);

                // Calculer les statistiques des langues pour inclusion dans les données SuperAdmin
                const calculatedLanguageStats = {
                  totalLanguages:
                    languageStats.byStatus?.reduce(
                      (total: number, statusData: any) => total + statusData.count,
                      0
                    ) || 0,
                  activeLanguages: languageStats.totalActive || 0,
                  pendingLanguages: languageStats.totalPending || 0,
                  approvedLanguages: languageStats.totalActive || 0, // active = approved dans ce contexte
                  byStatus: languageStats.byStatus || [],
                  wordsByLanguage: contentAnalytics?.wordsByLanguage || [], // Safe navigation
                };

                // Calculer les statistiques des catégories pour inclusion dans les données SuperAdmin
                const calculatedCategoryStats = {
                  totalCategories:
                    categoryStats.byStatus?.reduce(
                      (total: number, statusData: any) => total + statusData.count,
                      0
                    ) || 0,
                  activeCategories: categoryStats.totalActive || 0,
                  pendingCategories: categoryStats.totalPending || 0,
                  approvedCategories: categoryStats.totalActive || 0, // active = approved dans ce contexte
                  byStatus: categoryStats.byStatus || [],
                  wordsByCategory: contentAnalytics?.wordsByCategory || [], // Safe navigation
                };

                console.log('📊 FRONTEND DEBUG - Données brutes reçues:');
                console.log('- languageStats:', languageStats);
                console.log('- categoryStats:', categoryStats);
                console.log('- languageStats.totalPending:', languageStats.totalPending);
                console.log('- categoryStats.totalPending:', categoryStats.totalPending);
                console.log('📈 Statistiques calculées:');
                console.log('- calculatedLanguageStats.pendingLanguages:', calculatedLanguageStats.pendingLanguages);
                console.log('- calculatedCategoryStats.pendingCategories:', calculatedCategoryStats.pendingCategories);
                console.log('- calculatedLanguageStats complet:', calculatedLanguageStats);
                console.log('- calculatedCategoryStats complet:', calculatedCategoryStats);

                // Enrichir les données SuperAdmin avec les analytics RÉELLES
                return {
                  ...superAdminData,
                  languageStats: calculatedLanguageStats,
                  categoryStats: calculatedCategoryStats,
                  contentStats: contentAnalytics || { wordsByLanguage: [] },
                } as SuperAdminDashboard;
              })
            );
          }),
          catchError((error) => {
            console.error('❌ Erreur lors du chargement complet:', error);
            // En cas d'erreur complète, charger juste les données SuperAdmin de base
            return this.adminApiService.getSuperAdminDashboard();
          })
        );
        break;
      default:
        dataObservable = this.adminApiService.getDashboard();
        break;
    }

    console.log('📡 Appel API pour le dashboard type:', dashboardType);
    dataObservable
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('❌ Erreur API dashboard:', error);
          this.dashboardStateSubject.next({
            isLoading: false,
            error: 'Erreur lors du chargement des données',
            dashboardType,
            data: null,
          });
          return of(null);
        })
      )
      .subscribe((data) => {
        console.log("✅ Données reçues de l'API:", data);
        if (data) {
          this.dashboardStateSubject.next({
            isLoading: false,
            error: null,
            dashboardType,
            data,
          });
          console.log('✅ État du dashboard mis à jour avec les données');
        } else {
          console.warn("⚠️ Pas de données reçues de l'API");
        }
      });
  }

  /**
   * Réessaie le chargement en cas d'erreur
   */
  public retryLoad(): void {
    this.loadDashboard();
  }

  /**
   * Obtient le titre du dashboard selon le type
   */
  public getDashboardTitle(dashboardType: string): string {
    switch (dashboardType) {
      case 'contributor':
        return 'Dashboard Contributeur';
      case 'admin':
        return 'Dashboard Administrateur';
      case 'superadmin':
        return 'Dashboard Super-Administrateur';
      default:
        return 'Dashboard Administrateur';
    }
  }

  /**
   * Formate l'uptime en format lisible
   */
  public formatUptime(uptimeMs: number): string {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Formate la mémoire en MB avec gestion des valeurs nulles
   * @param heapUsed - Mémoire heap réellement utilisée en bytes
   * @param rss - Mémoire résidente totale (Resident Set Size) en bytes
   */
  public formatMemory(heapUsed?: number, rss?: number): string {
    if (!heapUsed || !rss || isNaN(heapUsed) || isNaN(rss)) {
      return 'N/A';
    }
    const heapUsedMB = Math.round(heapUsed / 1024 / 1024);
    const rssMB = Math.round(rss / 1024 / 1024);
    return `${heapUsedMB}MB / ${rssMB}MB`;
  }

  /**
   * Gère les actions émises par le composant dashboard-stats
   */
  public handleDashboardAction(action: DashboardStatsAction): void {
    switch (action.type) {
      case 'view_users':
        this.router.navigate(['/admin/users']);
        break;

      case 'view_words':
        this.router.navigate(['/admin/moderation']);
        break;

      case 'view_communities':
        this.router.navigate(['/admin/communities']);
        break;

      case 'refresh':
        this.loadDashboard();
        break;

      case 'export':
        this.exportDashboardData();
        break;

      default:
        console.warn('Action non gérée:', action.type);
    }
  }

  /**
   * Obtient les initiales d'un utilisateur
   */
  public getInitials(user: any): string {
    if (!user) return '';

    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }

    return 'A';
  }

  /**
   * Méthodes utilitaires pour éviter les castings dans le template
   */
  public getContributorData(data: any): ContributorDashboard | null {
    return data as ContributorDashboard;
  }

  public getAdminData(data: any): AdminDashboard | null {
    return data as AdminDashboard;
  }

  public getSuperAdminData(data: any): SuperAdminDashboard | null {
    console.log('🔍 getSuperAdminData - Données complètes:', data);
    if (data) {
      console.log('📊 Structure stats:', data.stats);
      console.log('⚡ Structure systemHealth:', data.systemHealth);
      console.log('🧠 Structure memory détaillée:', data.systemHealth?.memory);
      console.log('📝 Structure recentActivity:', data.recentActivity);
      console.log('✅ Structure correcte SuperAdminDashboard détectée');
    }
    return data as SuperAdminDashboard;
  }

  public getDashboardStatsData(data: any): DashboardStats | null {
    return data as DashboardStats;
  }

  /**
   * Calcule les communautés actives (70% du total)
   */
  public getActiveCommunities(totalCommunities: number): number {
    return Math.floor((totalCommunities || 0) * 0.7);
  }

  /**
   * Calcule les nouvelles communautés ce mois (10% du total)
   */
  public getNewCommunitiesThisMonth(totalCommunities: number): number {
    return Math.floor((totalCommunities || 0) * 0.1);
  }

  /**
   * Calcule les messages ce mois (20% du total)
   */
  public getMessagesThisMonth(totalMessages: number): number {
    return Math.floor((totalMessages || 0) * 0.2);
  }

  /**
   * Calcule les messages privés (60% du total)
   */
  public getPrivateMessages(totalMessages: number): number {
    return Math.floor((totalMessages || 0) * 0.6);
  }

  /**
   * Calcule les mots approuvés (total - en attente)
   */
  public getApprovedWords(totalWords: number, pendingWords: number): number {
    return (totalWords || 0) - (pendingWords || 0);
  }

  /**
   * Retourne le nombre de langues selon le type - DONNÉES RÉELLES
   */
  public getLanguageCount(
    type: 'total' | 'active' | 'pending' | 'approved',
    languageStats?: any
  ): number {
    if (!languageStats) {
      return 0;
    }

    // Utiliser les vraies données de l'API
    switch (type) {
      case 'total':
        return languageStats.totalLanguages || 0;
      case 'active':
        return languageStats.activeLanguages || 0;
      case 'pending':
        return languageStats.pendingLanguages || 0;
      case 'approved':
        return languageStats.approvedLanguages || 0;
      default:
        return 0;
    }
  }

  /**
   * Retourne le nombre de mots pour une langue spécifique - DONNÉES RÉELLES
   */
  public getTopLanguageWords(language: string, contentStats?: any): number {
    if (!contentStats || !contentStats.wordsByLanguage) {
      return 0;
    }

    // Chercher la langue dans les données réelles
    const languageData = contentStats.wordsByLanguage.find(
      (item: any) => item.language.toLowerCase() === language.toLowerCase()
    );

    return languageData ? languageData.count : 0;
  }

  /**
   * Retourne le pourcentage d'une langue - DONNÉES RÉELLES
   */
  public getLanguagePercentage(language: string, contentStats?: any): number {
    if (!contentStats || !contentStats.wordsByLanguage) {
      return 0;
    }

    // Chercher la langue dans les données réelles
    const languageData = contentStats.wordsByLanguage.find(
      (item: any) => item.language.toLowerCase() === language.toLowerCase()
    );

    return languageData ? Math.round(languageData.percentage) : 0;
  }

  /**
   * Expose Math.round pour le template
   */
  public Math = Math;

  /**
   * Retourne les classes CSS pour les cartes de langue selon l'index
   */
  public getLanguageCardClass(index: number): string {
    const classes = [
      'border-l-4 border-blue-400',
      'border-l-4 border-green-400',
      'border-l-4 border-yellow-400',
      'border-l-4 border-purple-400',
      'border-l-4 border-red-400',
      'border-l-4 border-indigo-400',
      'border-l-4 border-pink-400',
      'border-l-4 border-teal-400',
    ];
    return classes[index % classes.length];
  }

  /**
   * Retourne les classes CSS pour le texte selon l'index
   */
  public getLanguageTextClass(index: number): string {
    const classes = [
      'text-blue-400',
      'text-green-400',
      'text-yellow-400',
      'text-purple-400',
      'text-red-400',
      'text-indigo-400',
      'text-pink-400',
      'text-teal-400',
    ];
    return classes[index % classes.length];
  }

  /**
   * Retourne le nombre de catégories selon le type - DONNÉES RÉELLES
   */
  public getCategoryCount(
    type: 'total' | 'active' | 'pending' | 'approved',
    categoryStats?: any
  ): number {
    if (!categoryStats) {
      return 0;
    }

    // Utiliser les vraies données de l'API
    switch (type) {
      case 'total':
        return categoryStats.totalCategories || 0;
      case 'active':
        return categoryStats.activeCategories || 0;
      case 'pending':
        return categoryStats.pendingCategories || 0;
      case 'approved':
        return categoryStats.approvedCategories || 0;
      default:
        return 0;
    }
  }

  /**
   * Retourne la classe CSS pour les cartes de catégories - STYLE DYNAMIQUE
   */
  public getCategoryCardClass(index: number): string {
    const colors = [
      'border-l-4 border-orange-400',
      'border-l-4 border-cyan-400',
      'border-l-4 border-pink-400',
      'border-l-4 border-yellow-400',
    ];
    return colors[index % colors.length];
  }

  /**
   * Retourne la classe CSS pour le texte des catégories - STYLE DYNAMIQUE
   */
  public getCategoryTextClass(index: number): string {
    const colors = [
      'text-orange-400',
      'text-cyan-400',
      'text-pink-400',
      'text-yellow-400',
    ];
    return colors[index % colors.length];
  }

  /**
   * Exporte les données du dashboard
   */
  private exportDashboardData(): void {
    // Utiliser l'AdminApiService pour exporter
    this.adminApiService
      .exportReport('full', 'json', '30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Créer et télécharger le fichier
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `dashboard-export-${
            new Date().toISOString().split('T')[0]
          }.json`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error("Erreur lors de l'export:", error);
          // Ici, on pourrait ajouter une notification toast
        },
      });
  }
}
