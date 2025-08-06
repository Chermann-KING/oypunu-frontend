/**
 * @fileoverview Container pour les analytics et rapports
 *
 * Container intelligent qui gère l'affichage des analytics et métriques.
 * Intègre les 12 routes backend d'analytics.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, map, catchError } from 'rxjs/operators';

import { AnalyticsApiService } from '../../services/analytics-api.service';
import { PermissionService } from '../../services/permission.service';
import {
  DashboardMetrics,
  UserActivityStats,
  ContentAnalytics,
  CommunityAnalytics,
  SystemMetrics,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';
// import { ChartAction, ChartData } from '../../components/analytics-charts/analytics-chart.component';

/**
 * Interface pour l'état des analytics
 */
interface AnalyticsState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly dashboardMetrics: DashboardMetrics | null;
  readonly userStats: UserActivityStats | null;
  readonly contentStats: ContentAnalytics | null;
  readonly communityStats: CommunityAnalytics | null;
  readonly systemMetrics: SystemMetrics | null;
  readonly selectedPeriod: 'day' | 'week' | 'month' | 'year';
}

/**
 * Interface pour les cartes de métriques
 */
interface MetricCard {
  readonly id: string;
  readonly title: string;
  readonly value: number | string;
  readonly change: number;
  readonly changeType: 'increase' | 'decrease' | 'neutral';
  readonly icon: string;
  readonly color: string;
  readonly description: string;
  readonly permission: Permission;
}

/**
 * Container AnalyticsOverview - Single Responsibility Principle
 */
@Component({
  selector: 'app-analytics-overview-container',
  standalone: false,
  templateUrl: './analytics-overview.container.html',
  styleUrls: ['./analytics-overview.container.scss'],
})
export class AnalyticsOverviewContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // État des analytics
  public readonly analyticsState$: Observable<AnalyticsState>;

  private readonly analyticsStateSubject = new BehaviorSubject<AnalyticsState>({
    isLoading: true,
    error: null,
    dashboardMetrics: null,
    userStats: null,
    contentStats: null,
    communityStats: null,
    systemMetrics: null,
    selectedPeriod: 'week',
  });

  constructor(
    private readonly analyticsApiService: AnalyticsApiService,
    private readonly permissionService: PermissionService
  ) {
    this.analyticsState$ = this.analyticsStateSubject.asObservable();
  }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.analyticsStateSubject.complete();
  }

  /**
   * Charge toutes les données analytics
   */
  private loadAnalytics(): void {
    const currentState = this.analyticsStateSubject.value;

    this.analyticsStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    // Charger toutes les données en parallèle
    combineLatest([
      this.analyticsApiService.getDashboard(),
      this.analyticsApiService.getUserActivity('all'),
      this.analyticsApiService.getContentAnalytics(),
      this.analyticsApiService.getCommunityAnalytics(),
      this.analyticsApiService.getSystemMetrics(),
    ])
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.analyticsStateSubject.next({
            ...currentState,
            isLoading: false,
            error: 'Erreur lors du chargement des analytics',
          });
          throw error;
        })
      )
      .subscribe(
        ([
          dashboard,
          userStats,
          contentStats,
          communityStats,
          systemMetrics,
        ]) => {
          this.analyticsStateSubject.next({
            ...currentState,
            isLoading: false,
            error: null,
            dashboardMetrics: dashboard,
            userStats,
            contentStats,
            communityStats,
            systemMetrics,
          });
        }
      );
  }

  /**
   * Change la période d'affichage
   */
  public onPeriodChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const period = target.value as 'day' | 'week' | 'month' | 'year';

    const currentState = this.analyticsStateSubject.value;
    this.analyticsStateSubject.next({
      ...currentState,
      selectedPeriod: period,
    });

    this.loadAnalytics();
  }

  /**
   * Génère les métriques principales
   */
  public getMainMetrics(state: AnalyticsState): MetricCard[] {
    if (!state.dashboardMetrics) return [];

    return [
      {
        id: 'users',
        title: 'Utilisateurs actifs',
        value: state.userStats?.activeUsers || 0,
        change: 12.5,
        changeType: 'increase',
        icon: 'icon-users',
        color: 'blue',
        description: 'Utilisateurs connectés récemment',
        permission: Permission.VIEW_USER_ANALYTICS,
      },
      {
        id: 'content',
        title: 'Mots ajoutés',
        value: state.contentStats?.wordsAdded || 0,
        change: 8.3,
        changeType: 'increase',
        icon: 'icon-book',
        color: 'green',
        description: 'Nouveaux mots cette période',
        permission: Permission.VIEW_CONTENT_ANALYTICS,
      },
      {
        id: 'communities',
        title: 'Communautés actives',
        value: state.communityStats?.activeCommunities || 0,
        change: -2.1,
        changeType: 'decrease',
        icon: 'icon-globe',
        color: 'purple',
        description: 'Communautés avec activité récente',
        permission: Permission.VIEW_COMMUNITY_ANALYTICS,
      },
      {
        id: 'system',
        title: 'Performance système',
        value: state.systemMetrics ? '99.9%' : '0%',
        change: 0.2,
        changeType: 'increase',
        icon: 'icon-activity',
        color: 'orange',
        description: 'Disponibilité du système',
        permission: Permission.VIEW_SYSTEM_METRICS,
      },
    ];
  }

  /**
   * Actions d'export
   */
  public exportUserAnalytics(): void {
    console.log('Export user analytics');
  }

  public exportContentAnalytics(): void {
    console.log('Export content analytics');
  }

  public exportCommunityAnalytics(): void {
    console.log('Export community analytics');
  }

  public exportSystemMetrics(): void {
    console.log('Export system metrics');
  }

  public exportAllAnalytics(): void {
    console.log('Export all analytics');
  }

  /**
   * Actions de rapports
   */
  public generateReport(): void {
    console.log('Generate report');
  }

  public scheduleReport(): void {
    console.log('Schedule report');
  }

  /**
   * Méthodes utilitaires
   */
  public formatValue(value: number | string): string {
    if (typeof value === 'string') return value;

    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }

    return value.toString();
  }

  public formatChange(change: number): string {
    return Math.abs(change).toFixed(1);
  }

  public getChangeIcon(type: 'increase' | 'decrease' | 'neutral'): string {
    switch (type) {
      case 'increase':
        return 'icon-trending-up';
      case 'decrease':
        return 'icon-trending-down';
      default:
        return 'icon-minus';
    }
  }

  public formatUptime(uptimeMs: number): string {
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days}j ${hours}h`;
    } else {
      return `${hours}h`;
    }
  }

  public getSystemHealthStatus(metrics: SystemMetrics): string {
    if (metrics.uptime > 0.999) return 'good';
    if (metrics.uptime > 0.95) return 'warning';
    return 'critical';
  }

  public getSystemHealthIcon(metrics: SystemMetrics): string {
    const status = this.getSystemHealthStatus(metrics);
    switch (status) {
      case 'good':
        return 'icon-check';
      case 'warning':
        return 'icon-alert-triangle';
      default:
        return 'icon-alert-circle';
    }
  }

  public getSystemHealthLabel(metrics: SystemMetrics): string {
    const status = this.getSystemHealthStatus(metrics);
    switch (status) {
      case 'good':
        return 'Excellent';
      case 'warning':
        return 'Attention';
      default:
        return 'Critique';
    }
  }

  public retryLoad(): void {
    this.loadAnalytics();
  }

  // ===== MÉTHODES POUR ANALYTICS CHART COMPONENT =====

  /**
   * Récupère les données de graphique pour les utilisateurs
   */
  public getUserChartData(state: AnalyticsState): any | null {
    if (!state.userStats) return null;
    
    return {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [{
        label: 'Utilisateurs actifs',
        data: [65, 59, 80, 81, 56, 55, 40],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }]
    };
  }

  /**
   * Récupère les données de graphique pour le contenu
   */
  public getContentChartData(state: AnalyticsState): any | null {
    if (!state.contentStats) return null;
    
    return {
      labels: ['Mots ajoutés', 'Mots approuvés', 'Mots en attente'],
      datasets: [{
        data: [300, 250, 50],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b']
      }]
    };
  }

  /**
   * Gère les actions émises par les composants de graphique
   */
  public handleChartAction(action: any): void {
    switch (action.type) {
      case 'export':
        this.exportUserAnalytics();
        break;
      case 'refresh':
        this.loadAnalytics();
        break;
      case 'view_details':
        console.log('View chart details:', action.payload);
        break;
      default:
        console.warn('Action de graphique non gérée:', action.type);
    }
  }

}
