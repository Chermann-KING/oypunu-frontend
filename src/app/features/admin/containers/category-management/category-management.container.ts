/**
 * @fileoverview Container pour la gestion des catégories
 * 
 * Container principal qui gère l'état, la logique métier et la coordination
 * entre les composants de gestion des catégories.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map, takeUntil, catchError, finalize } from 'rxjs/operators';

import { CategoryListComponent } from '../../components/category-list/category-list.component';
import { CategoryFormComponent } from '../../components/category-form/category-form.component';
import { CategoryFiltersComponent } from '../../components/category-filters/category-filters.component';

import { AdminApiService } from '../../services/admin-api.service';
import { 
  CategoryAdmin, 
  CreateCategoryData, 
  UpdateCategoryData,
  PaginatedResponse,
  ApiResponse 
} from '../../models/admin.models';

/**
 * États de la vue
 */
export type CategoryViewState = 'list' | 'create' | 'edit';

/**
 * Filtres de catégories
 */
export interface CategoryFilters {
  readonly languageId?: string;
  readonly search?: string;
  readonly isActive?: boolean;
}

/**
 * Container principal pour la gestion des catégories
 * 
 * Responsabilités:
 * - Gestion de l'état des catégories
 * - Coordination entre les composants enfants
 * - Appels API centralisés
 * - Gestion des erreurs et du loading
 */
@Component({
  selector: 'app-category-management-container',
  standalone: false,
  template: `
    <div class="min-h-screen bg-gray-900 text-white">
      <!-- Vue liste des catégories -->
      <div class="container mx-auto px-4 py-8" *ngIf="(currentView$ | async) === 'list'">
        <!-- Header avec informations et actions -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-white">Gestion des Catégories</h1>
                <p class="text-gray-400">Gérer les catégories par langue pour l'organisation du dictionnaire</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <button 
                (click)="onCreateCategory()"
                [disabled]="isLoading$ | async"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nouvelle Catégorie
              </button>
            </div>
          </div>
        </div>

        <!-- Filtres -->
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
          <app-category-filters
            [filters]="currentFilters$ | async"
            [isLoading]="(isLoading$ | async) || false"
            (filtersChange)="onFiltersChange($event)"
            (reset)="onResetFilters()"
          ></app-category-filters>
        </div>

        <!-- Messages d'erreur -->
        <div *ngIf="error$ | async as error" class="bg-red-900 border border-red-700 rounded-lg p-6 mb-6" role="alert">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <h3 class="text-red-400 font-semibold mb-2">Erreur</h3>
              <p class="text-red-300 mb-4">{{ error }}</p>
              <button 
                (click)="clearError()"
                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>

        <!-- Messages de succès -->
        <div *ngIf="successMessage$ | async as message" class="bg-green-900 border border-green-700 rounded-lg p-6 mb-6" role="alert">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <h3 class="text-green-400 font-semibold mb-2">Succès</h3>
              <p class="text-green-300 mb-4">{{ message }}</p>
              <button 
                (click)="clearSuccess()"
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>

        <!-- Liste des catégories -->
        <div class="bg-gray-800 rounded-lg p-6">
          <!-- Indicateur de chargement -->
          <div *ngIf="isLoading$ | async" class="flex justify-center items-center py-16">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p class="text-gray-400">Chargement des catégories...</p>
            </div>
          </div>

          <!-- Contenu de la liste -->
          <div *ngIf="!(isLoading$ | async)">
            <app-category-list
              [categories]="categories$ | async"
              [pagination]="pagination$ | async"
              [isLoading]="(isLoading$ | async) || false"
              [selectedCategories]="(selectedCategories$ | async) || []"
              (categoryEdit)="onEditCategory($event)"
              (categoryDelete)="onDeleteCategory($event)"
              (categoryToggleActive)="onToggleActiveCategory($event)"
              (selectionChange)="onSelectionChange($event)"
              (pageChange)="onPageChange($event)"
              (sortChange)="onSortChange($event)"
            ></app-category-list>
          </div>
        </div>

        <!-- Actions en lot -->
        <div *ngIf="hasSelectedCategories$ | async" class="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
          <div class="container mx-auto flex items-center justify-between">
            <div class="text-white">
              {{ (selectedCategories$ | async)?.length }} catégorie(s) sélectionnée(s)
            </div>
            
            <div class="flex items-center gap-2">
              <button 
                class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                (click)="onBulkActivate()"
                [disabled]="isLoading$ | async">
                Activer
              </button>
              
              <button 
                class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                (click)="onBulkDeactivate()"
                [disabled]="isLoading$ | async">
                Désactiver
              </button>
              
              <button 
                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                (click)="onBulkDelete()"
                [disabled]="isLoading$ | async">
                Supprimer
              </button>

              <button 
                class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                (click)="onClearSelection()">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Vue création -->
      <div class="container mx-auto px-4 py-8" *ngIf="(currentView$ | async) === 'create'">
        <!-- Header de retour -->
        <div class="mb-6">
          <button (click)="onCancelCreate()" 
            class="flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à la liste
          </button>
        </div>

        <div class="bg-gray-800 rounded-lg p-6">
          <app-category-form
            [isLoading]="(isLoading$ | async) || false"
            (submit)="onCreateSubmit($event)"
            (cancel)="onCancelCreate()"
          ></app-category-form>
        </div>
      </div>

      <!-- Vue édition -->
      <div class="container mx-auto px-4 py-8" *ngIf="(currentView$ | async) === 'edit'">
        <!-- Header de retour -->
        <div class="mb-6">
          <button (click)="onCancelEdit()" 
            class="flex items-center text-gray-400 hover:text-white mb-4 transition-colors">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à la liste
          </button>
        </div>

        <div class="bg-gray-800 rounded-lg p-6">
          <app-category-form
            [category]="selectedCategory$ | async"
            [isLoading]="(isLoading$ | async) || false"
            [isEditMode]="true"
            (submit)="onEditSubmit($event)"
            (cancel)="onCancelEdit()"
          ></app-category-form>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./category-management.container.scss']
})
export class CategoryManagementContainer implements OnInit, OnDestroy {
  // Sujets pour la gestion d'état
  private readonly destroy$ = new Subject<void>();
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _successMessage$ = new BehaviorSubject<string | null>(null);
  
  // État des catégories
  private readonly _categories$ = new BehaviorSubject<CategoryAdmin[]>([]);
  private readonly _pagination$ = new BehaviorSubject<any>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // État de la vue
  private readonly _currentView$ = new BehaviorSubject<CategoryViewState>('list');
  private readonly _selectedCategory$ = new BehaviorSubject<CategoryAdmin | null>(null);
  private readonly _selectedCategories$ = new BehaviorSubject<string[]>([]);
  private readonly _currentFilters$ = new BehaviorSubject<CategoryFilters>({});

  // Observables publics pour les templates
  readonly isLoading$ = this._isLoading$.asObservable();
  readonly error$ = this._error$.asObservable();
  readonly successMessage$ = this._successMessage$.asObservable();
  readonly categories$ = this._categories$.asObservable();
  readonly pagination$ = this._pagination$.asObservable();
  readonly currentView$ = this._currentView$.asObservable();
  readonly selectedCategory$ = this._selectedCategory$.asObservable();
  readonly selectedCategories$ = this._selectedCategories$.asObservable();
  readonly currentFilters$ = this._currentFilters$.asObservable();

  // Observables dérivés
  readonly hasSelectedCategories$ = this._selectedCategories$.pipe(
    map(selected => selected.length > 0)
  );

  constructor(private adminApiService: AdminApiService) {}

  ngOnInit(): void {
    console.log('🏗️ CategoryManagementContainer - Initialisation');
    this.loadCategories();
    
    // Surveiller les changements de filtres pour recharger automatiquement
    this._currentFilters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this._currentView$.value === 'list') {
        this.loadCategories();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== MÉTHODES DE CHARGEMENT =====

  /**
   * Charge les catégories avec filtres et pagination
   */
  private loadCategories(): void {
    console.log('📥 CategoryManagementContainer - Chargement des catégories');
    
    const currentFilters = this._currentFilters$.value;
    const currentPagination = this._pagination$.value;
    
    this.setLoading(true);
    this.clearError();

    this.adminApiService
      .getCategories(
        currentPagination.page,
        currentPagination.limit,
        currentFilters.languageId
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: (response: PaginatedResponse<CategoryAdmin>) => {
          console.log('✅ Catégories chargées:', response);
          this._categories$.next(response.data);
          this._pagination$.next({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: response.totalPages,
            hasNextPage: response.hasNextPage,
            hasPrevPage: response.hasPrevPage
          });
        },
        error: (error) => {
          console.error('❌ Erreur chargement catégories:', error);
          this.setError('Erreur lors du chargement des catégories');
        }
      });
  }

  // ===== HANDLERS D'ÉVÉNEMENTS =====

  /**
   * Gestion du changement de filtres
   */
  onFiltersChange(filters: CategoryFilters): void {
    console.log('🔍 Filtres changés:', filters);
    this._currentFilters$.next(filters);
    // Reset de la pagination lors du changement de filtres
    this._pagination$.next({ ...this._pagination$.value, page: 1 });
  }

  /**
   * Reset des filtres
   */
  onResetFilters(): void {
    console.log('🔄 Reset des filtres');
    this._currentFilters$.next({});
  }

  /**
   * Changement de page
   */
  onPageChange(page: number): void {
    console.log('📄 Changement de page:', page);
    this._pagination$.next({ ...this._pagination$.value, page });
    this.loadCategories();
  }

  /**
   * Changement de tri
   */
  onSortChange(sort: { field: string; direction: 'asc' | 'desc' }): void {
    console.log('🔤 Changement de tri:', sort);
    // Implémenter le tri côté client ou server selon les besoins
    this.loadCategories();
  }

  /**
   * Création d'une nouvelle catégorie
   */
  onCreateCategory(): void {
    console.log('➕ Création d\'une catégorie');
    this._currentView$.next('create');
    this._selectedCategory$.next(null);
  }

  /**
   * Édition d'une catégorie
   */
  onEditCategory(category: CategoryAdmin): void {
    console.log('✏️ Édition de la catégorie:', category.name);
    this._selectedCategory$.next(category);
    this._currentView$.next('edit');
  }

  /**
   * Suppression d'une catégorie
   */
  onDeleteCategory(category: CategoryAdmin): void {
    console.log('🗑️ Suppression de la catégorie:', category.name);
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    this.setLoading(true);
    this.adminApiService
      .deleteCategory(category.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(`Catégorie "${category.name}" supprimée avec succès`);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur suppression:', error);
          this.setError('Erreur lors de la suppression de la catégorie');
        }
      });
  }

  /**
   * Basculer le statut actif d'une catégorie
   */
  onToggleActiveCategory(category: CategoryAdmin): void {
    console.log('🔄 Toggle statut actif:', category.name, !category.isActive);
    
    const updateData: UpdateCategoryData = {
      isActive: !category.isActive
    };

    this.setLoading(true);
    this.adminApiService
      .updateCategory(category.id, updateData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: () => {
          const status = !category.isActive ? 'activée' : 'désactivée';
          this.setSuccessMessage(`Catégorie "${category.name}" ${status} avec succès`);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur toggle statut:', error);
          this.setError('Erreur lors de la modification du statut');
        }
      });
  }

  /**
   * Gestion de la sélection multiple
   */
  onSelectionChange(selectedIds: string[]): void {
    console.log('✅ Sélection changée:', selectedIds);
    this._selectedCategories$.next(selectedIds);
  }

  /**
   * Effacer la sélection
   */
  onClearSelection(): void {
    this._selectedCategories$.next([]);
  }

  /**
   * Soumission du formulaire de création
   */
  onCreateSubmit(categoryData: CreateCategoryData | UpdateCategoryData): void {
    console.log('💾 Création de catégorie:', categoryData);
    
    // Convertir en CreateCategoryData si nécessaire
    const createData: CreateCategoryData = {
      name: categoryData.name || '',
      description: categoryData.description,
      languageId: categoryData.languageId || '',
      order: categoryData.order || 0,
      isActive: categoryData.isActive ?? true
    };

    this.setLoading(true);
    this.adminApiService
      .createCategory(createData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: (newCategory) => {
          console.log('✅ Catégorie créée:', newCategory);
          this.setSuccessMessage(`Catégorie "${newCategory.name}" créée avec succès`);
          this._currentView$.next('list');
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur création:', error);
          this.setError('Erreur lors de la création de la catégorie');
        }
      });
  }

  /**
   * Annulation de la création
   */
  onCancelCreate(): void {
    console.log('❌ Annulation création');
    this._currentView$.next('list');
    this._selectedCategory$.next(null);
  }

  /**
   * Soumission du formulaire d'édition
   */
  onEditSubmit(updateData: CreateCategoryData | UpdateCategoryData): void {
    const currentCategory = this._selectedCategory$.value;
    if (!currentCategory) return;

    console.log('💾 Modification de catégorie:', updateData);
    
    // Convertir en UpdateCategoryData si nécessaire 
    const updateCategoryData: UpdateCategoryData = {
      name: updateData.name,
      description: updateData.description,
      languageId: updateData.languageId,
      order: updateData.order,
      isActive: updateData.isActive
    };
    
    this.setLoading(true);
    this.adminApiService
      .updateCategory(currentCategory.id, updateCategoryData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: (updatedCategory) => {
          console.log('✅ Catégorie modifiée:', updatedCategory);
          this.setSuccessMessage(`Catégorie "${updatedCategory.name}" modifiée avec succès`);
          this._currentView$.next('list');
          this._selectedCategory$.next(null);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur modification:', error);
          this.setError('Erreur lors de la modification de la catégorie');
        }
      });
  }

  /**
   * Annulation de l'édition
   */
  onCancelEdit(): void {
    console.log('❌ Annulation édition');
    this._currentView$.next('list');
    this._selectedCategory$.next(null);
  }

  /**
   * Actions en lot - Activation
   */
  onBulkActivate(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('🔢 Activation en lot:', selectedIds);
    
    if (!confirm(`Activer ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)) {
      return;
    }

    this.performBulkAction(selectedIds, 'activate', 'Catégories activées avec succès');
  }

  /**
   * Actions en lot - Désactivation
   */
  onBulkDeactivate(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('🔢 Désactivation en lot:', selectedIds);
    
    if (!confirm(`Désactiver ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)) {
      return;
    }

    this.performBulkAction(selectedIds, 'deactivate', 'Catégories désactivées avec succès');
  }

  /**
   * Actions en lot - Suppression
   */
  onBulkDelete(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('🔢 Suppression en lot:', selectedIds);
    
    if (!confirm(`Supprimer définitivement ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)) {
      return;
    }

    this.performBulkAction(selectedIds, 'delete', 'Catégories supprimées avec succès');
  }

  /**
   * Actions en lot - Approbation (pour les contributeurs)
   */
  onBulkApprove(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('✅ Approbation en lot:', selectedIds);
    
    if (!confirm(`Approuver ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)) {
      return;
    }

    this.performBulkAction(selectedIds, 'approve', 'Catégories approuvées avec succès');
  }

  /**
   * Actions en lot - Rejet (pour les contributeurs)
   */
  onBulkReject(): void {
    const selectedIds = this._selectedCategories$.value;
    if (selectedIds.length === 0) return;

    console.log('❌ Rejet en lot:', selectedIds);
    
    const reason = prompt('Raison du rejet (optionnel):');
    if (reason === null) return; // User cancelled
    
    if (!confirm(`Rejeter ${selectedIds.length} catégorie(s) sélectionnée(s) ?`)) {
      return;
    }

    this.performBulkActionWithReason(selectedIds, 'reject', reason, 'Catégories rejetées avec succès');
  }

  /**
   * Exécute une action en lot
   */
  private performBulkAction(
    categoryIds: string[], 
    action: 'activate' | 'deactivate' | 'approve' | 'reject' | 'delete',
    successMessage: string
  ): void {
    this.setLoading(true);
    
    this.adminApiService
      .bulkModerateCategories(categoryIds, action)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(successMessage);
          this._selectedCategories$.next([]);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur action en lot:', error);
          this.setError(`Erreur lors de l'action en lot`);
        }
      });
  }

  /**
   * Exécute une action en lot avec raison (pour reject)
   */
  private performBulkActionWithReason(
    categoryIds: string[], 
    action: 'approve' | 'reject',
    reason: string,
    successMessage: string
  ): void {
    this.setLoading(true);
    
    this.adminApiService
      .bulkModerateCategories(categoryIds, action, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.setLoading(false))
      )
      .subscribe({
        next: () => {
          this.setSuccessMessage(successMessage);
          this._selectedCategories$.next([]);
          this.loadCategories();
        },
        error: (error) => {
          console.error('❌ Erreur action en lot avec raison:', error);
          this.setError(`Erreur lors de l'action en lot`);
        }
      });
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Définit l'état de chargement
   */
  private setLoading(loading: boolean): void {
    this._isLoading$.next(loading);
  }

  /**
   * Définit un message d'erreur
   */
  private setError(message: string): void {
    this._error$.next(message);
    this._successMessage$.next(null);
  }

  /**
   * Efface les erreurs
   */
  clearError(): void {
    this._error$.next(null);
  }

  /**
   * Définit un message de succès
   */
  private setSuccessMessage(message: string): void {
    this._successMessage$.next(message);
    this._error$.next(null);
  }

  /**
   * Efface les messages de succès
   */
  clearSuccess(): void {
    this._successMessage$.next(null);
  }
}