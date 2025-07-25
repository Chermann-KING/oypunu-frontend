import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguagesService } from '../../../../core/services/languages.service';
import { Word } from '../../../../core/models/word';
import { Category } from '../../../../core/models/category';
import { SearchResults } from '../../../../core/models/search-results';
import { SearchParams } from '../../../../core/models/search-params';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-search',
  standalone: false,
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit, OnDestroy {
  searchForm: FormGroup;
  searchResults: SearchResults | null = null;
  categories: Category[] = [];
  featuredWords: Word[] = [];
  recentSearches: string[] = [];
  isSearching = false;
  currentPage = 1;
  pageSize = 10;

  // Options pour les dropdowns
  languageOptions: DropdownOption[] = [];
  categoryOptions: DropdownOption[] = [];
  partOfSpeechOptions: DropdownOption[] = [];

  // Options pour les filtres (chargées dynamiquement)
  languages: any[] = [];
  partsOfSpeech = [
    { code: 'noun', name: 'Nom' },
    { code: 'verb', name: 'Verbe' },
    { code: 'adjective', name: 'Adjectif' },
    { code: 'adverb', name: 'Adverbe' },
    { code: 'pronoun', name: 'Pronom' },
    { code: 'preposition', name: 'Préposition' },
    { code: 'conjunction', name: 'Conjonction' },
    { code: 'interjection', name: 'Interjection' },
  ];

  private _destroy$ = new Subject<void>();

  constructor(
    private _fb: FormBuilder,
    private _dictionaryService: DictionaryService,
    private _authService: AuthService,
    private _languagesService: LanguagesService,
    private _router: Router,
    private _route: ActivatedRoute
  ) {
    this.searchForm = this._fb.group({
      query: [''],
      languages: [[]],
      categories: [[]],
      partsOfSpeech: [[]],
    });
  }

  ngOnInit(): void {
    // Charger les langues actives depuis la base de données
    this._languagesService
      .getActiveLanguages()
      .pipe(takeUntil(this._destroy$))
      .subscribe((languages) => {
        this.languages = languages.map(lang => ({
          code: lang.iso639_1 || lang.iso639_2 || lang.iso639_3 || lang._id,
          name: lang.name
        }));
        
        // Initialiser les options pour le dropdown des langues
        this.languageOptions = this.languages.map((lang) => ({
          value: lang.code,
          label: lang.name,
        }));
      });

    // Initialiser les options pour les types de mots
    this.partOfSpeechOptions = this.partsOfSpeech.map((pos) => ({
      value: pos.code,
      label: pos.name,
    }));

    // Charger les catégories
    this._dictionaryService
      .getCategories()
      .pipe(takeUntil(this._destroy$))
      .subscribe((categories) => {
        this.categories = categories;
        // Transformer les catégories en options pour le dropdown
        this.categoryOptions = categories.map((cat) => ({
          value: cat.id ?? '',
          label: cat.name,
        }));
      });

    // Charger les mots vedettes
    this._dictionaryService
      .getFeaturedWords(3)
      .pipe(takeUntil(this._destroy$))
      .subscribe((words) => {
        this.featuredWords = words;
      });

    // S'abonner aux recherches récentes
    this._dictionaryService.recentSearches$
      .pipe(takeUntil(this._destroy$))
      .subscribe((searches) => {
        this.recentSearches = searches;
      });

    // Vérifier si on a des paramètres de recherche dans l'URL
    this._route.queryParams
      .pipe(takeUntil(this._destroy$))
      .subscribe((params) => {
        if (params['query']) {
          this.searchForm.patchValue({
            query: params['query'],
            languages: params['languages']
              ? params['languages'].split(',')
              : [],
            categories: params['categories']
              ? params['categories'].split(',')
              : [],
            partsOfSpeech: params['partsOfSpeech']
              ? params['partsOfSpeech'].split(',')
              : [],
          });

          this.currentPage = params['page'] ? parseInt(params['page']) : 1;

          this._performSearch();
        }
      });

    // Détecter les changements de formulaire
    this.searchForm
      .get('query')
      ?.valueChanges.pipe(
        takeUntil(this._destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
        this._updateUrlAndSearch();
      });

    // Détecter les changements de filtres
    this.searchForm
      .get('languages')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this._updateUrlAndSearch();
      });

    this.searchForm
      .get('categories')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this._updateUrlAndSearch();
      });

    this.searchForm
      .get('partsOfSpeech')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this._updateUrlAndSearch();
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  onSearch(): void {
    this.currentPage = 1;
    this._performSearch();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this._updateUrlAndSearch();
  }

  onRecentSearchClick(query: string): void {
    this.searchForm.patchValue({ query });
    this.onSearch();
  }

  toggleFavorite(word: Word): void {
    if (word.isFavorite) {
      this._dictionaryService.removeFromFavorites(word.id).subscribe();
    } else {
      this._dictionaryService.addToFavorites(word.id).subscribe();
    }
  }

  private _updateUrlAndSearch(): void {
    const formValues = this.searchForm.value;

    if (formValues.query && formValues.query.trim() !== '') {
      // Mettre à jour l'URL avec les paramètres de recherche
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams: {
          query: formValues.query,
          languages: formValues.languages?.length
            ? formValues.languages.join(',')
            : null,
          categories: formValues.categories?.length
            ? formValues.categories.join(',')
            : null,
          partsOfSpeech: formValues.partsOfSpeech?.length
            ? formValues.partsOfSpeech.join(',')
            : null,
          page: this.currentPage,
        },
        queryParamsHandling: 'merge',
      });

      this._performSearch();
    } else if (this.searchResults) {
      // Réinitialiser les résultats si la recherche est vide
      this.searchResults = null;
      this._router.navigate([], {
        relativeTo: this._route,
        queryParams: {},
      });
    }
  }

  private _performSearch(): void {
    const formValues = this.searchForm.value;

    if (!formValues.query || formValues.query.trim() === '') {
      return;
    }

    this.isSearching = true;

    const searchParams: SearchParams = {
      query: formValues.query,
      languages: formValues.languages,
      categories: formValues.categories,
      partsOfSpeech: formValues.partsOfSpeech,
      page: this.currentPage,
      limit: this.pageSize,
    };

    this._dictionaryService
      .searchWords(searchParams)
      .pipe(takeUntil(this._destroy$))
      .subscribe((results) => {
        this.searchResults = results;
        this.isSearching = false;
      });
  }

  getLanguageName(code: string): string {
    return this.languages.find((l) => l.code === code)?.name || '';
  }

  getPartOfSpeechName(code: string): string {
    return this.partsOfSpeech.find((p) => p.code === code)?.name || '';
  }

  get isAuthenticated(): boolean {
    return this._authService.isAuthenticated();
  }
}
