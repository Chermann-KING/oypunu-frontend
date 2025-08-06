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
import { takeUntil, map, catchError } from 'rxjs/operators';

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
          if (!user || !user.role) {
            throw new Error('Utilisateur non authentifié ou rôle manquant');
          }

          // Déterminer le type de dashboard selon le rôle et les données de route
          const dashboardType = this.determineDashboardType(
            user.role as UserRole,
            routeData
          );
          return { user, dashboardType };
        }),
        catchError((error) => {
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
    let dataObservable: Observable<any>;

    switch (dashboardType) {
      case 'contributor':
        dataObservable = this.adminApiService.getContributorDashboard();
        break;
      case 'admin':
        dataObservable = this.adminApiService.getAdminDashboard();
        break;
      case 'superadmin':
        dataObservable = this.adminApiService.getSuperAdminDashboard();
        break;
      default:
        dataObservable = this.adminApiService.getDashboard();
        break;
    }

    dataObservable
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
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
        if (data) {
          this.dashboardStateSubject.next({
            isLoading: false,
            error: null,
            dashboardType,
            data,
          });
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
   * Méthodes utilitaires pour éviter les castings dans le template
   */
  public getContributorData(data: any): ContributorDashboard | null {
    return data as ContributorDashboard;
  }

  public getAdminData(data: any): AdminDashboard | null {
    return data as AdminDashboard;
  }

  public getSuperAdminData(data: any): SuperAdminDashboard | null {
    return data as SuperAdminDashboard;
  }

  public getDashboardStatsData(data: any): DashboardStats | null {
    return data as DashboardStats;
  }

  /**
   * Exporte les données du dashboard
   */
  private exportDashboardData(): void {
    // Utiliser l'AdminApiService pour exporter
    this.adminApiService.exportReport('full', 'json', '30d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Créer et télécharger le fichier
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Erreur lors de l\'export:', error);
          // Ici, on pourrait ajouter une notification toast
        }
      });
  }
}
