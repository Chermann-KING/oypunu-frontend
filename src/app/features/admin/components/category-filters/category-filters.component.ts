/**
 * @fileoverview Composant de filtres pour les catégories
 * 
 * Composant responsable du filtrage et de la recherche dans la liste des catégories.
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
  OnInit, 
  OnDestroy,
  ChangeDetectionStrategy 
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, map, catchError } from 'rxjs/operators';

import { DictionaryService } from '../../../../core/services/dictionary.service';

/**
 * Interface pour les filtres de catégories
 */
export interface CategoryFilters {
  readonly languageId?: string;
  readonly search?: string;
  readonly isActive?: boolean;
}

/**
 * Interface pour une option de langue
 */
export interface LanguageOption {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly nativeName?: string;
}

/**
 * Composant de filtres pour les catégories
 */
@Component({
  selector: 'app-category-filters',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h3 class="text-lg font-semibold text-white mb-4">Filtres</h3>
      <form [formGroup]="filtersForm">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <!-- Recherche textuelle -->
          <div>
            <label for="search" class="block text-sm font-medium text-gray-300 mb-2">
              Recherche
            </label>
            <div class="relative">
              <input
                type="text"
                id="search"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                formControlName="search"
                placeholder="Nom ou description de catégorie..."
                [disabled]="isLoading"
              />
              <button
                *ngIf="hasSearchTerm"
                type="button"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                (click)="clearSearch()"
                title="Effacer la recherche"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Filtre par langue -->
          <div>
            <label for="languageId" class="block text-sm font-medium text-gray-300 mb-2">
              Langue
            </label>
            
            <div *ngIf="isLoadingLanguages$ | async" class="flex items-center text-gray-400">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              <span class="text-sm">Chargement...</span>
            </div>

            <select
              *ngIf="!(isLoadingLanguages$ | async)"
              id="languageId"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              formControlName="languageId"
              [disabled]="isLoading"
            >
              <option value="">Toutes les langues</option>
              <option 
                *ngFor="let language of availableLanguages$ | async"
                [value]="language.id"
                [title]="language.nativeName"
              >
                {{ language.name }}
                <span *ngIf="language.nativeName && language.nativeName !== language.name">
                  ({{ language.nativeName }})
                </span>
              </option>
            </select>
          </div>

          <!-- Filtre par statut -->
          <div>
            <label for="isActive" class="block text-sm font-medium text-gray-300 mb-2">
              Statut
            </label>
            <select
              id="isActive"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              formControlName="isActive"
              [disabled]="isLoading"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actives seulement</option>
              <option value="false">Inactives seulement</option>
            </select>
          </div>

          <!-- Actions des filtres -->
          <div class="flex items-end gap-2">
            <button
              type="button"
              class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
              (click)="onReset()"
              [disabled]="isLoading || !hasActiveFilters"
              title="Réinitialiser tous les filtres"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <!-- Indicateurs de filtres actifs -->
        <div *ngIf="hasActiveFilters" class="flex items-center gap-2 text-sm">
          <span class="text-gray-300">Filtres actifs :</span>
          
          <!-- Tag recherche -->
          <span *ngIf="hasSearchTerm" class="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-xs">
            "{{ currentFilters.search }}"
            <button 
              type="button" 
              class="hover:text-gray-300"
              (click)="removeFilter('search')"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>

          <!-- Tag langue -->
          <span *ngIf="hasLanguageFilter" class="inline-flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs">
            {{ getSelectedLanguageName() }}
            <button 
              type="button" 
              class="hover:text-gray-300"
              (click)="removeFilter('languageId')"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>

          <!-- Tag statut -->
          <span *ngIf="hasStatusFilter" class="inline-flex items-center gap-1 bg-purple-600 text-white px-2 py-1 rounded text-xs">
            {{ getStatusLabel() }}
            <button 
              type="button" 
              class="hover:text-gray-300"
              (click)="removeFilter('isActive')"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./category-filters.component.scss']
})
export class CategoryFiltersComponent implements OnInit, OnDestroy {
  // Propriétés d'entrée
  @Input() filters: CategoryFilters | null = null;
  @Input() isLoading: boolean = false;

  // Événements de sortie
  @Output() filtersChange = new EventEmitter<CategoryFilters>();
  @Output() reset = new EventEmitter<void>();

  // Formulaire des filtres
  filtersForm: FormGroup;

  // Gestion de la destruction du composant
  private readonly destroy$ = new Subject<void>();

  // État des langues
  private readonly _isLoadingLanguages$ = new BehaviorSubject<boolean>(false);
  private readonly _availableLanguages$ = new BehaviorSubject<LanguageOption[]>([]);

  // Observables publics pour les templates
  readonly isLoadingLanguages$ = this._isLoadingLanguages$.asObservable();
  readonly availableLanguages$ = this._availableLanguages$.asObservable();

  constructor(
    private formBuilder: FormBuilder,
    private dictionaryService: DictionaryService
  ) {
    this.filtersForm = this.createFiltersForm();
  }

  ngOnInit(): void {
    console.log('🔍 CategoryFiltersComponent - Initialisation');
    this.loadAvailableLanguages();
    this.setupFormSubscriptions();
    
    // Appliquer les filtres initiaux s'ils existent
    if (this.filters) {
      this.applyFiltersToForm(this.filters);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== CRÉATION DU FORMULAIRE =====

  /**
   * Crée le FormGroup pour les filtres
   */
  private createFiltersForm(): FormGroup {
    return this.formBuilder.group({
      search: [''],
      languageId: [''],
      isActive: ['']
    });
  }

  /**
   * Configure les abonnements au formulaire
   */
  private setupFormSubscriptions(): void {
    // Recherche avec debounce pour éviter trop d'appels
    this.filtersForm.get('search')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.emitFilters();
      });

    // Autres champs sans debounce
    this.filtersForm.get('languageId')?.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.emitFilters();
      });

    this.filtersForm.get('isActive')?.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.emitFilters();
      });
  }

  // ===== CHARGEMENT DES LANGUES =====

  /**
   * Charge les langues disponibles
   */
  private loadAvailableLanguages(): void {
    console.log('🌍 Chargement des langues pour filtres...');
    
    this._isLoadingLanguages$.next(true);

    this.dictionaryService.getAvailableLanguages()
      .pipe(
        map((languages: any[]) => 
          languages.map(lang => ({
            id: lang.id,
            name: lang.name,
            code: lang.code,
            nativeName: lang.nativeName
          } as LanguageOption))
        ),
        catchError((error) => {
          console.error('❌ Erreur chargement langues filtres:', error);
          return [];
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (languages) => {
          console.log('✅ Langues chargées pour filtres:', languages.length);
          this._availableLanguages$.next(languages);
          this._isLoadingLanguages$.next(false);
        },
        error: (error) => {
          console.error('❌ Erreur finale langues filtres:', error);
          this._isLoadingLanguages$.next(false);
        }
      });
  }

  // ===== GESTION DES FILTRES =====

  /**
   * Applique les filtres externes au formulaire
   */
  private applyFiltersToForm(filters: CategoryFilters): void {
    this.filtersForm.patchValue({
      search: filters.search || '',
      languageId: filters.languageId || '',
      isActive: filters.isActive !== undefined ? filters.isActive.toString() : ''
    }, { emitEvent: false });
  }

  /**
   * Émet les filtres actuels
   */
  private emitFilters(): void {
    const formValue = this.filtersForm.value;
    const filters: CategoryFilters = {
      search: formValue.search?.trim() || undefined,
      languageId: formValue.languageId || undefined,
      isActive: formValue.isActive !== '' ? formValue.isActive === 'true' : undefined
    };

    // Supprimer les propriétés undefined
    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    ) as CategoryFilters;

    console.log('🔍 Émission des filtres:', cleanedFilters);
    this.filtersChange.emit(cleanedFilters);
  }

  // ===== PROPRIÉTÉS CALCULÉES =====

  /**
   * Obtient les filtres actuels
   */
  get currentFilters(): CategoryFilters {
    const formValue = this.filtersForm.value;
    return {
      search: formValue.search?.trim() || undefined,
      languageId: formValue.languageId || undefined,
      isActive: formValue.isActive !== '' ? formValue.isActive === 'true' : undefined
    };
  }

  /**
   * Vérifie si des filtres sont actifs
   */
  get hasActiveFilters(): boolean {
    const filters = this.currentFilters;
    return !!(filters.search || filters.languageId || filters.isActive !== undefined);
  }

  /**
   * Vérifie si une recherche textuelle est active
   */
  get hasSearchTerm(): boolean {
    return !!(this.filtersForm.get('search')?.value?.trim());
  }

  /**
   * Vérifie si un filtre de langue est actif
   */
  get hasLanguageFilter(): boolean {
    return !!(this.filtersForm.get('languageId')?.value);
  }

  /**
   * Vérifie si un filtre de statut est actif
   */
  get hasStatusFilter(): boolean {
    return !!(this.filtersForm.get('isActive')?.value);
  }

  // ===== GESTION DES ÉVÉNEMENTS =====

  /**
   * Efface la recherche textuelle
   */
  clearSearch(): void {
    console.log('🔍 Effacement de la recherche');
    this.filtersForm.patchValue({ search: '' });
  }

  /**
   * Supprime un filtre spécifique
   */
  removeFilter(filterName: string): void {
    console.log('🔍 Suppression du filtre:', filterName);
    this.filtersForm.patchValue({ [filterName]: '' });
  }

  /**
   * Applique les filtres manuellement
   */
  onApplyFilters(): void {
    console.log('🔍 Application manuelle des filtres');
    this.emitFilters();
  }

  /**
   * Réinitialise tous les filtres
   */
  onReset(): void {
    console.log('🔍 Réinitialisation des filtres');
    
    this.filtersForm.reset();
    this.filtersForm.patchValue({
      search: '',
      languageId: '',
      isActive: ''
    });

    this.reset.emit();
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Obtient le nom de la langue sélectionnée
   */
  getSelectedLanguageName(): string {
    const selectedId = this.filtersForm.get('languageId')?.value;
    if (!selectedId) return '';

    const languages = this._availableLanguages$.value;
    const selectedLanguage = languages.find(lang => lang.id === selectedId);
    
    return selectedLanguage ? selectedLanguage.name : 'Langue inconnue';
  }

  /**
   * Obtient le label du statut sélectionné
   */
  getStatusLabel(): string {
    const statusValue = this.filtersForm.get('isActive')?.value;
    
    switch (statusValue) {
      case 'true': return 'Actives';
      case 'false': return 'Inactives';
      default: return 'Tous';
    }
  }

  /**
   * Obtient le nombre de filtres actifs
   */
  getActiveFiltersCount(): number {
    const filters = this.currentFilters;
    let count = 0;
    
    if (filters.search) count++;
    if (filters.languageId) count++;
    if (filters.isActive !== undefined) count++;
    
    return count;
  }
}