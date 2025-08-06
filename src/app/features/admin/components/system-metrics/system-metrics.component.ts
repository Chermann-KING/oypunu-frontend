/**
 * @fileoverview Composant présentationnel System Metrics - SOLID Principles
 *
 * Composant pur qui affiche les métriques système et de performance.
 * Ne contient aucune logique métier, uniquement la présentation des données.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Types de métriques système
 */
export type MetricType =
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network'
  | 'database'
  | 'api'
  | 'users';

/**
 * Statuts des métriques
 */
export type MetricStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Interface pour une métrique individuelle
 */
export interface SystemMetric {
  readonly id: string;
  readonly name: string;
  readonly type: MetricType;
  readonly value: number;
  readonly unit: string;
  readonly status: MetricStatus;
  readonly threshold: {
    readonly warning: number;
    readonly critical: number;
  };
  readonly trend: {
    readonly direction: 'up' | 'down' | 'stable';
    readonly percentage: number;
  };
  readonly lastUpdated: Date;
  readonly description?: string;
}

/**
 * Interface pour un groupe de métriques
 */
export interface MetricGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly metrics: SystemMetric[];
  readonly overallStatus: MetricStatus;
}

/**
 * Interface pour l'historique des métriques
 */
export interface MetricHistory {
  readonly timestamp: Date;
  readonly value: number;
}

/**
 * Interface pour les actions des métriques
 */
export interface SystemMetricAction {
  readonly type:
    | 'refresh'
    | 'export'
    | 'alert_config'
    | 'view_details'
    | 'restart_service';
  readonly metricId?: string;
  readonly payload?: any;
}

/**
 * Interface pour la configuration d'alerte
 */
export interface AlertConfig {
  readonly metricId: string;
  readonly warningThreshold: number;
  readonly criticalThreshold: number;
  readonly enabled: boolean;
}

/**
 * Composant SystemMetrics - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher les métriques système de manière organisée et interactive
 */
@Component({
  selector: 'app-system-metrics',
  standalone: false,
  templateUrl: './system-metrics.component.html',
  styleUrls: ['./system-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemMetricsComponent {
  // ===== INPUTS =====

  @Input() metricGroups: MetricGroup[] = [];
  @Input() metricHistory: Record<string, MetricHistory[]> = {};
  @Input() systemInfo: {
    hostname: string;
    version: string;
    uptime: number;
    lastCollectionTime: Date;
  } | null = null;
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;

  // ===== OUTPUTS =====

  @Output() actionClicked = new EventEmitter<SystemMetricAction>();
  @Output() metricClicked = new EventEmitter<SystemMetric>();
  @Output() alertConfigRequested = new EventEmitter<AlertConfig>();

  // ===== PROPRIÉTÉS INTERNES =====

  private expandedGroups = new Set<string>(['cpu', 'memory']); // Groupes ouverts par défaut

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Vérifie si des métriques sont disponibles
   */
  public hasMetrics(): boolean {
    return this.metricGroups.length > 0;
  }

  /**
   * Obtient une vue d'ensemble du système
   */
  public getSystemOverview(): {
    overallStatus: MetricStatus;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
  } | null {
    if (!this.hasMetrics()) return null;

    const allMetrics = this.metricGroups.flatMap((group) => group.metrics);
    const counts = {
      healthy: allMetrics.filter((m) => m.status === 'healthy').length,
      warning: allMetrics.filter((m) => m.status === 'warning').length,
      critical: allMetrics.filter((m) => m.status === 'critical').length,
      unknown: allMetrics.filter((m) => m.status === 'unknown').length,
    };

    let overallStatus: MetricStatus = 'healthy';
    if (counts.critical > 0) {
      overallStatus = 'critical';
    } else if (counts.warning > 0) {
      overallStatus = 'warning';
    } else if (counts.unknown > 0) {
      overallStatus = 'unknown';
    }

    return {
      overallStatus,
      healthyCount: counts.healthy,
      warningCount: counts.warning,
      criticalCount: counts.critical,
    };
  }

  /**
   * Gestion des actions principales
   */
  public onAction(type: SystemMetricAction['type'], payload?: any): void {
    this.actionClicked.emit({ type, payload });
  }

  /**
   * Gestion du clic sur une métrique
   */
  public onMetricClick(metric: SystemMetric): void {
    this.metricClicked.emit(metric);
  }

  /**
   * Gestion des actions spécifiques à une métrique
   */
  public onMetricAction(
    type: SystemMetricAction['type'],
    metric: SystemMetric,
    event: Event
  ): void {
    event.stopPropagation();
    this.onAction(type, { metricId: metric.id });
  }

  /**
   * Toggle d'un groupe de métriques
   */
  public toggleGroup(groupId: string): void {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }
  }

  /**
   * Vérifie si un groupe est étendu
   */
  public isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups.has(groupId);
  }

  /**
   * Obtient l'historique d'une métrique
   */
  public getMetricHistory(metricId: string): MetricHistory[] | null {
    return this.metricHistory[metricId] || null;
  }

  /**
   * Vérifie si une métrique a des actions rapides
   */
  public hasQuickActions(metric: SystemMetric): boolean {
    return this.canRestartService(metric) || true; // Toujours "voir détails"
  }

  /**
   * Vérifie si un service peut être redémarré
   */
  public canRestartService(metric: SystemMetric): boolean {
    return ['api', 'database'].includes(metric.type);
  }

  /**
   * Vérifie si c'est une métrique en pourcentage
   */
  public isPercentageMetric(metric: SystemMetric): boolean {
    return (
      metric.unit === '%' || ['cpu', 'memory', 'disk'].includes(metric.type)
    );
  }

  // ===== MÉTHODES DE FORMATAGE =====

  /**
   * Formate la valeur d'une métrique
   */
  public formatMetricValue(value: number): string {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'G';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  }

  /**
   * Formate la valeur de tendance
   */
  public formatTrendValue(percentage: number): string {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  }

  /**
   * Formate un temps relatif
   */
  public formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins}min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `il y a ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `il y a ${diffDays}j`;
  }

  /**
   * Formate l'uptime en format lisible
   */
  public formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Formate une date et heure complète
   */
  public formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  // ===== MÉTHODES D'ICÔNES ET LABELS =====

  /**
   * Obtient l'icône d'un statut
   */
  public getStatusIcon(status: MetricStatus): string {
    const icons: Record<MetricStatus, string> = {
      healthy: 'icon-check-circle',
      warning: 'icon-alert-triangle',
      critical: 'icon-x-circle',
      unknown: 'icon-help-circle',
    };
    return icons[status];
  }

  /**
   * Obtient le libellé d'un statut
   */
  public getStatusLabel(status: MetricStatus): string {
    const labels: Record<MetricStatus, string> = {
      healthy: 'Optimal',
      warning: 'Attention',
      critical: 'Critique',
      unknown: 'Inconnu',
    };
    return labels[status];
  }

  /**
   * Obtient l'icône d'un groupe
   */
  public getGroupIcon(groupId: string): string {
    const icons: Record<string, string> = {
      cpu: 'icon-cpu',
      memory: 'icon-hard-drive',
      disk: 'icon-database',
      network: 'icon-wifi',
      database: 'icon-server',
      api: 'icon-activity',
      users: 'icon-users',
    };
    return icons[groupId] || 'icon-bar-chart';
  }

  /**
   * Obtient l'icône d'une tendance
   */
  public getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
    const icons = {
      up: 'icon-trending-up',
      down: 'icon-trending-down',
      stable: 'icon-minus',
    };
    return icons[direction];
  }

  // ===== MÉTHODES POUR GRAPHIQUES =====

  /**
   * Génère les points pour un graphique miniature
   */
  public getMiniChartPoints(history: MetricHistory[]): string {
    if (history.length < 2) return '';

    const maxValue = Math.max(...history.map((h) => h.value));
    const minValue = Math.min(...history.map((h) => h.value));
    const range = maxValue - minValue || 1;

    const points = history
      .map((point, index) => {
        const x = (index / (history.length - 1)) * 100;
        const y = 20 - ((point.value - minValue) / range) * 20;
        return `${x},${y}`;
      })
      .join(' ');

    return points;
  }

  // ===== TRACKBY FUNCTIONS =====

  public trackByGroupId(index: number, group: MetricGroup): string {
    return group.id;
  }

  public trackByMetricId(index: number, metric: SystemMetric): string {
    return metric.id;
  }
}
