/**
 * @fileoverview Composant présentationnel Moderation Panel - SOLID Principles
 *
 * Composant pur qui affiche le panneau de modération de contenu.
 * Ne contient aucune logique métier, uniquement la présentation et les interactions UI.
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
 * Types de contenu à modérer
 */
export type ContentType =
  | 'word'
  | 'definition'
  | 'comment'
  | 'report'
  | 'user_profile';

/**
 * Statuts de modération
 */
export type ModerationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'flagged'
  | 'escalated';

/**
 * Priorités de modération
 */
export type ModerationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Interface pour un élément à modérer
 */
export interface ModerationItem {
  readonly id: string;
  readonly type: ContentType;
  readonly content: string;
  readonly originalContent?: string;
  readonly author: {
    readonly id: string;
    readonly username: string;
    readonly email: string;
    readonly profilePicture?: string;
  };
  readonly submittedAt: Date;
  readonly status: ModerationStatus;
  readonly priority: ModerationPriority;
  readonly flags: string[];
  readonly reportCount: number;
  readonly assignedTo?: string;
  readonly language?: string;
  readonly context?: {
    readonly communityId?: string;
    readonly communityName?: string;
    readonly parentId?: string;
  };
  readonly metadata?: Record<string, any>;
}

/**
 * Interface pour les filtres de modération
 */
export interface ModerationFilters {
  readonly type?: ContentType;
  readonly status?: ModerationStatus;
  readonly priority?: ModerationPriority;
  readonly assignedTo?: string;
  readonly dateRange?: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly search?: string;
  readonly flagsOnly?: boolean;
}

/**
 * Interface pour les actions de modération
 */
export interface ModerationAction {
  readonly type:
    | 'approve'
    | 'reject'
    | 'flag'
    | 'escalate'
    | 'assign'
    | 'bulk_approve'
    | 'bulk_reject'
    | 'export'
    | 'refresh';
  readonly items: ModerationItem[];
  readonly reason?: string;
  readonly assignTo?: string;
  readonly notes?: string;
}

/**
 * Interface pour les statistiques de modération
 */
export interface ModerationStats {
  readonly total: number;
  readonly pending: number;
  readonly approved: number;
  readonly rejected: number;
  readonly flagged: number;
  readonly escalated: number;
  readonly averageProcessingTime: number; // en minutes
  readonly backlogDays: number;
}

/**
 * Composant ModerationPanel - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher et gérer le panneau de modération de contenu
 */
@Component({
  selector: 'app-moderation-panel',
  standalone: false,
  templateUrl: './moderation-panel.component.html',
  styleUrls: ['./moderation-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationPanelComponent {
  // ===== INPUTS =====

  @Input() items: ModerationItem[] = [];
  @Input() selectedItems: string[] = [];
  @Input() filters: ModerationFilters | null = null;
  @Input() stats: ModerationStats | null = null;
  @Input() pagination: {
    page: number;
    pageSize: number;
    total: number;
  } | null = null;
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;

  // ===== OUTPUTS =====

  @Output() actionClicked = new EventEmitter<ModerationAction>();
  @Output() itemSelectionChanged = new EventEmitter<string[]>();
  @Output() filterChanged = new EventEmitter<ModerationFilters>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() itemDetailsRequested = new EventEmitter<ModerationItem>();

  // ===== PROPRIÉTÉS INTERNES =====

  private openDropdowns = new Set<string>();

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Vérifie si des éléments sont disponibles
   */
  public hasItems(): boolean {
    return this.items.length > 0;
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  public hasActiveFilters(): boolean {
    return !!(
      this.filters?.type ||
      this.filters?.status ||
      this.filters?.priority ||
      this.filters?.search ||
      this.filters?.flagsOnly
    );
  }

  /**
   * Gestion des actions principales
   */
  public onAction(
    type: ModerationAction['type'],
    items: ModerationItem[]
  ): void {
    this.actionClicked.emit({ type, items });
  }

  /**
   * Gestion des actions sur un élément individuel
   */
  public onItemAction(
    type: ModerationAction['type'],
    item: ModerationItem
  ): void {
    this.onAction(type, [item]);
  }

  /**
   * Gestion des actions en lot
   */
  public onBulkAction(type: ModerationAction['type']): void {
    const selectedItemObjects = this.items.filter((item) =>
      this.selectedItems.includes(item.id)
    );
    this.onAction(type, selectedItemObjects);
  }

  /**
   * Gestion du changement de sélection d'un élément
   */
  public onItemSelectionChange(itemId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    let newSelection: string[];

    if (target.checked) {
      newSelection = [...this.selectedItems, itemId];
    } else {
      newSelection = this.selectedItems.filter((id) => id !== itemId);
    }

    this.itemSelectionChanged.emit(newSelection);
  }

  /**
   * Vérifie si un élément est sélectionné
   */
  public isItemSelected(itemId: string): boolean {
    return this.selectedItems.includes(itemId);
  }

  /**
   * Gestion du changement de filtres
   */
  public onFilterChange(field: keyof ModerationFilters, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    let value: any = target.value || undefined;

    if (field === 'flagsOnly') {
      value = (target as HTMLInputElement).checked;
    }

    const newFilters = {
      ...this.filters,
      [field]: value,
    };

    this.filterChanged.emit(newFilters);
  }

  /**
   * Effacement des filtres
   */
  public clearFilters(): void {
    this.filterChanged.emit({});
  }

  /**
   * Gestion du changement de page
   */
  public onPageChange(page: number): void {
    this.pageChanged.emit(page);
  }

  /**
   * Toggle du menu déroulant
   */
  public toggleDropdown(itemId: string): void {
    if (this.openDropdowns.has(itemId)) {
      this.openDropdowns.delete(itemId);
    } else {
      this.openDropdowns.clear();
      this.openDropdowns.add(itemId);
    }
  }

  /**
   * Vérifie si un menu déroulant est ouvert
   */
  public isDropdownOpen(itemId: string): boolean {
    return this.openDropdowns.has(itemId);
  }

  /**
   * Demande d'affichage des détails d'un élément
   */
  public viewItemDetails(item: ModerationItem): void {
    this.itemDetailsRequested.emit(item);
    this.openDropdowns.clear();
  }

  /**
   * TrackBy function pour optimiser les performances
   */
  public trackByItemId(index: number, item: ModerationItem): string {
    return item.id;
  }

  public trackByFlag(index: number, flag: string): string {
    return flag;
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Obtient le libellé d'un type de contenu
   */
  public getContentTypeLabel(type: ContentType): string {
    const labels: Record<ContentType, string> = {
      word: 'Mot',
      definition: 'Définition',
      comment: 'Commentaire',
      report: 'Signalement',
      user_profile: 'Profil',
    };
    return labels[type] || type;
  }

  /**
   * Obtient le libellé d'une priorité
   */
  public getPriorityLabel(priority: ModerationPriority): string {
    const labels: Record<ModerationPriority, string> = {
      low: 'Basse',
      medium: 'Moyenne',
      high: 'Haute',
      critical: 'Critique',
    };
    return labels[priority] || priority;
  }

  /**
   * Obtient les initiales d'un auteur
   */
  public getAuthorInitials(author: ModerationItem['author']): string {
    return author.username.charAt(0).toUpperCase();
  }

  /**
   * Formate une date relative
   */
  public formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `il y a ${diffMins}min`;
    } else if (diffHours < 24) {
      return `il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `il y a ${diffDays}j`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  }

  /**
   * Formate un temps en heures/minutes
   */
  public formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
    }
  }

  /**
   * Obtient la plage d'affichage pour la pagination
   */
  public getDisplayRange(): string {
    if (!this.pagination) return '';

    const start = (this.pagination.page - 1) * this.pagination.pageSize + 1;
    const end = Math.min(
      this.pagination.page * this.pagination.pageSize,
      this.pagination.total
    );

    return `${start}-${end}`;
  }

  /**
   * Obtient le nombre total de pages
   */
  public getTotalPages(): number {
    if (!this.pagination) return 1;
    return Math.ceil(this.pagination.total / this.pagination.pageSize);
  }

  /**
   * Obtient les pages visibles pour la pagination
   */
  public getVisiblePages(): number[] {
    if (!this.pagination) return [1];

    const totalPages = this.getTotalPages();
    const currentPage = this.pagination.page;
    const pages: number[] = [];

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}
