/**
 * @fileoverview Container pour la modération de contenu
 *
 * Container intelligent qui gère l'affichage et les actions de modération.
 * Intègre les 6 routes backend de modération de contenu.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {
  takeUntil,
  catchError,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { AdminApiService } from '../../services/admin-api.service';
import { PermissionService } from '../../services/permission.service';
import {
  PendingWord,
  ModerationStatus,
  PendingWordFilters,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';
// import { ModerationAction, BulkModerationAction } from '../../components/moderation-panel/moderation-panel.component';

/**
 * Interface pour l'état de la modération
 */
interface ModerationState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly pendingWords: PendingWord[];
  readonly totalWords: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly filters: PendingWordFilters;
  readonly selectedWords: string[];
}

/**
 * Container ContentModeration - Single Responsibility Principle
 */
@Component({
  selector: 'app-content-moderation-container',
  standalone: false,
  templateUrl: './content-moderation.container.html',
  styleUrls: ['./content-moderation.container.scss'],
})
export class ContentModerationContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // État de la modération
  public readonly moderationState$: Observable<ModerationState>;

  private readonly moderationStateSubject =
    new BehaviorSubject<ModerationState>({
      isLoading: true,
      error: null,
      pendingWords: [],
      totalWords: 0,
      currentPage: 1,
      pageSize: 10,
      filters: {},
      selectedWords: [],
    });

  // Contrôles de recherche et filtres
  public searchTerm = '';
  private readonly searchSubject = new Subject<string>();

  constructor(
    private readonly adminApiService: AdminApiService,
    private readonly permissionService: PermissionService
  ) {
    this.moderationState$ = this.moderationStateSubject.asObservable();

    // Configuration de la recherche avec debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.updateFilters({ search: searchTerm || undefined });
      });
  }

  ngOnInit(): void {
    this.loadPendingWords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.moderationStateSubject.complete();
  }

  /**
   * Charge la liste des mots en attente
   */
  private loadPendingWords(): void {
    const currentState = this.moderationStateSubject.value;

    this.moderationStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    this.adminApiService
      .getPendingWords(
        currentState.currentPage,
        currentState.pageSize,
        currentState.filters
      )
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.moderationStateSubject.next({
            ...currentState,
            isLoading: false,
            error: 'Erreur lors du chargement des mots en attente',
          });
          throw error;
        })
      )
      .subscribe((response) => {
        this.moderationStateSubject.next({
          ...currentState,
          isLoading: false,
          error: null,
          pendingWords: response.data,
          totalWords: response.total,
          selectedWords: [],
        });
      });
  }

  /**
   * Met à jour les filtres et recharge les données
   */
  private updateFilters(newFilters: Partial<PendingWordFilters>): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      filters: { ...currentState.filters, ...newFilters },
      currentPage: 1,
      selectedWords: [],
    });
    this.loadPendingWords();
  }

  // ===== MÉTHODES PUBLIQUES POUR LE TEMPLATE =====

  /**
   * Gestion de la recherche
   */
  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(target.value);
  }

  /**
   * Gestion du filtre par langue
   */
  public onLanguageFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFilters({ language: target.value || undefined });
  }

  /**
   * Gestion du filtre par statut
   */
  public onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const status = target.value as ModerationStatus | '';
    this.updateFilters({ status: status || undefined });
  }

  /**
   * Efface tous les filtres
   */
  public clearFilters(): void {
    this.searchTerm = '';
    this.updateFilters({
      language: undefined,
      status: undefined,
      search: undefined,
    });
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  public hasActiveFilters(filters: PendingWordFilters): boolean {
    return !!(filters.language || filters.status || filters.search);
  }

  /**
   * Actions de modération
   */
  public moderateWord(wordId: string, status: string): void {
    console.log('Moderate word:', wordId, status);
    // Appel API pour modérer le mot
    this.loadPendingWords(); // Recharger après modération
  }

  public viewWordHistory(wordId: string): void {
    console.log('View word history:', wordId);
    // Afficher l'historique du mot
  }

  /**
   * Pagination
   */
  public goToPage(page: number): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      currentPage: page,
    });
    this.loadPendingWords();
  }

  public hasNextPage(state: ModerationState): boolean {
    return state.currentPage * state.pageSize < state.totalWords;
  }

  public getTotalPages(state: ModerationState): number {
    return Math.ceil(state.totalWords / state.pageSize);
  }

  /**
   * Méthodes utilitaires
   */
  public trackByWordId(index: number, word: PendingWord): string {
    return word.id;
  }

  public getStatusLabel(status: ModerationStatus): string {
    const labels: Record<ModerationStatus, string> = {
      [ModerationStatus.PENDING]: 'En attente',
      [ModerationStatus.APPROVED]: 'Approuvé',
      [ModerationStatus.REJECTED]: 'Rejeté',
    };
    return labels[status] || status;
  }

  public getPendingCount(words: PendingWord[]): number {
    return words.filter((word) => word.status === ModerationStatus.PENDING)
      .length;
  }

  public getTodayModerationCount(): number {
    // Simuler le compte des modérations d'aujourd'hui
    return 12; // À remplacer par un appel API
  }

  public retryLoad(): void {
    this.loadPendingWords();
  }

  // ===== MÉTHODES POUR MODERATION PANEL COMPONENT =====

  /**
   * Convertit les PendingWord en ModerationItem pour le composant moderation-panel
   */
  public convertToModerationItems(pendingWords: PendingWord[]): any[] {
    return pendingWords.map(word => ({
      id: word.id,
      type: 'word' as const,
      content: word.definition || word.word,
      originalContent: word.word,
      author: {
        id: word.submittedBy,
        username: word.submittedBy, // Utiliser l'ID comme fallback
        email: '', // Non disponible dans PendingWord
        profilePicture: undefined
      },
      submittedAt: word.submittedAt,
      status: word.status,
      priority: 'medium' as const, // Priorité par défaut
      flags: [],
      reportCount: 0,
      assignedTo: undefined,
      language: word.language,
      context: {
        communityId: undefined,
        communityName: undefined,
        parentId: undefined
      },
      metadata: {
        originalWord: word.word,
        wordType: 'pending'
      }
    }));
  }

  /**
   * Gère les actions émises par le composant moderation-panel
   */
  public handleModerationAction(action: any): void {
    switch (action.type) {
      case 'approve':
        this.moderateWord(action.item.id, 'approved');
        break;
      case 'reject':
        this.moderateWord(action.item.id, 'rejected');
        break;
      case 'view_history':
        this.viewWordHistory(action.item.id);
        break;
      default:
        console.warn('Action de modération non gérée:', action.type);
    }
  }

  /**
   * Gère les actions en lot émises par le composant moderation-panel
   */
  public handleBulkModerationAction(action: any): void {
    const { type, items } = action;
    const wordIds = items.map((item: any) => item.id);

    switch (type) {
      case 'bulk_approve':
        this.bulkModerateWords(wordIds, 'approved', 'Approbation en lot');
        break;
      case 'bulk_reject':
        this.bulkModerateWords(wordIds, 'rejected', 'Rejet en lot');
        break;
      case 'export':
        this.exportModerationData(wordIds);
        break;
      default:
        console.warn('Action en lot non gérée:', type);
    }
  }

  /**
   * Modère plusieurs mots en une seule opération
   */
  private bulkModerateWords(wordIds: string[], status: string, reason?: string): void {
    this.adminApiService.bulkModerateWords(wordIds, status, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log(`${wordIds.length} mots ${status === 'approved' ? 'approuvés' : 'rejetés'}`);
          this.loadPendingWords();
        },
        error: (error) => {
          console.error('Erreur lors de la modération en lot:', error);
        }
      });
  }

  /**
   * Exporte les données de modération sélectionnées
   */
  private exportModerationData(wordIds?: string[]): void {
    this.adminApiService.exportWords(wordIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `moderation-export-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Erreur lors de l\'export:', error);
        }
      });
  }
}
