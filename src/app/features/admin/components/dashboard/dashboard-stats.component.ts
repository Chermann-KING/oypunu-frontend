/**
 * @fileoverview Composant présentationnel Dashboard Stats - SOLID Principles
 *
 * Composant pur (presentational) qui affiche les statistiques du dashboard.
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
import { CommonModule } from '@angular/common';
import { DashboardStats, UserRole } from '../../models/admin.models';

/**
 * Interface pour les actions émises par le composant
 */
export interface DashboardStatsAction {
  readonly type:
    | 'view_users'
    | 'view_words'
    | 'view_communities'
    | 'refresh'
    | 'export';
  readonly payload?: any;
}

/**
 * Interface pour les cartes de statistiques
 */
interface StatCard {
  readonly id: string;
  readonly title: string;
  readonly value: number;
  readonly icon: string;
  readonly color: string;
  readonly trend?: {
    readonly value: number;
    readonly direction: 'up' | 'down' | 'stable';
  };
  readonly actionType?: 'view_users' | 'view_words' | 'view_communities';
}

/**
 * Composant DashboardStats - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher les statistiques du dashboard de manière attrayante
 */
@Component({
  selector: 'app-dashboard-stats',
  standalone: false,
  templateUrl: './dashboard-stats.component.html',
  styleUrls: ['./dashboard-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatsComponent {
  // ===== INPUTS =====

  @Input() stats: DashboardStats | null = null;
  @Input() userRole: UserRole | null = null;
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;

  // ===== OUTPUTS =====

  @Output() actionClicked = new EventEmitter<DashboardStatsAction>();

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Génère les cartes de statistiques selon le rôle
   */
  public getStatCards(): StatCard[] {
    if (!this.stats) return [];

    return [
      {
        id: 'users',
        title: 'Utilisateurs',
        value: this.stats.totalUsers,
        icon: 'icon-users',
        color: 'blue',
        trend: {
          value: this.calculateUserTrend(),
          direction: this.getUserTrendDirection(),
        },
        actionType: 'view_users',
      },
      {
        id: 'words',
        title: 'Mots',
        value: this.stats.totalWords,
        icon: 'icon-book',
        color: 'green',
        trend: {
          value: this.calculateWordTrend(),
          direction: this.getWordTrendDirection(),
        },
        actionType: 'view_words',
      },
      {
        id: 'communities',
        title: 'Communautés',
        value: this.stats.totalCommunities,
        icon: 'icon-globe',
        color: 'purple',
        trend: {
          value: this.calculateCommunityTrend(),
          direction: this.getCommunityTrendDirection(),
        },
        actionType: 'view_communities',
      },
      {
        id: 'system',
        title: 'Système',
        value: this.getSystemHealthScore(),
        icon: 'icon-activity',
        color: 'orange',
        trend: {
          value: 99.9,
          direction: 'stable',
        },
      },
    ];
  }

  /**
   * Détermine si les détails doivent être affichés selon le rôle
   */
  public shouldShowDetails(cardId: string): boolean {
    if (!this.userRole) return false;

    // Les admins voient tous les détails
    if (
      this.userRole === UserRole.ADMIN ||
      this.userRole === UserRole.SUPERADMIN
    ) {
      return true;
    }

    // Les contributeurs voient les détails des mots seulement
    if (this.userRole === UserRole.CONTRIBUTOR && cardId === 'words') {
      return true;
    }

    return false;
  }

  /**
   * Émet une action vers le container parent
   */
  public onAction(type: DashboardStatsAction['type'], event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.actionClicked.emit({ type });
  }

  /**
   * TrackBy function pour l'optimisation des performances
   */
  public trackByCardId(index: number, card: StatCard): string {
    return card.id;
  }

  /**
   * Formate les valeurs de statistiques
   */
  public formatStatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  /**
   * Formate les valeurs de tendances
   */
  public formatTrendValue(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  /**
   * Retourne l'icône de tendance appropriée
   */
  public getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
    switch (direction) {
      case 'up':
        return 'icon-trending-up';
      case 'down':
        return 'icon-trending-down';
      default:
        return 'icon-minus';
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  private calculateUserTrend(): number {
    if (!this.stats) return 0;
    // Calcul basé sur la croissance hebdomadaire
    return Math.round(
      (this.stats.newUsersThisWeek / this.stats.totalUsers) * 100
    );
  }

  private getUserTrendDirection(): 'up' | 'down' | 'stable' {
    const trend = this.calculateUserTrend();
    if (trend > 1) return 'up';
    if (trend < -1) return 'down';
    return 'stable';
  }

  private calculateWordTrend(): number {
    if (!this.stats) return 0;
    return Math.round(
      (this.stats.newWordsThisWeek / this.stats.totalWords) * 100
    );
  }

  private getWordTrendDirection(): 'up' | 'down' | 'stable' {
    const trend = this.calculateWordTrend();
    if (trend > 2) return 'up';
    if (trend < -2) return 'down';
    return 'stable';
  }

  private calculateCommunityTrend(): number {
    if (!this.stats) return 0;
    return Math.round(
      (this.stats.newCommunitiesThisMonth / this.stats.totalCommunities) * 100
    );
  }

  private getCommunityTrendDirection(): 'up' | 'down' | 'stable' {
    const trend = this.calculateCommunityTrend();
    if (trend > 5) return 'up';
    if (trend < -5) return 'down';
    return 'stable';
  }

  private getSystemHealthScore(): number {
    if (!this.stats?.systemHealthStatus) return 100;

    switch (this.stats.systemHealthStatus) {
      case 'healthy':
        return 100;
      case 'warning':
        return 85;
      case 'critical':
        return 60;
      default:
        return 100;
    }
  }
}
