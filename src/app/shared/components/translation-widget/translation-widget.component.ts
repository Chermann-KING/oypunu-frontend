import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, combineLatest, Observable, of } from 'rxjs';
import {
  takeUntil,
  distinctUntilChanged,
  debounceTime,
  map,
  catchError,
} from 'rxjs/operators';
import { TranslationService } from '../../../core/services/translation.service';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Translation,
  AvailableLanguage,
  LanguageOption,
  TranslationState,
  CreateTranslationRequest,
  VoteTranslationRequest,
} from '../../../core/models/translation';
import { Word } from '../../../core/models/word';
import { DropdownOption } from '../custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-translation-widget',
  standalone: false,
  templateUrl: './translation-widget.component.html',
  styleUrls: ['./translation-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationWidgetComponent implements OnInit, OnDestroy {
  @Input() word!: Word;
  @Input() showAddButton = true;
  @Input() compact = false;

  // État du composant
  selectedLanguage: string | null = null;
  availableLanguages: LanguageOption[] = [];
  currentTranslations: Translation[] = [];
  isLoading = false;
  error: string | null = null;

  // Modal d'ajout de traduction
  showAddModal = false;
  newTranslation = {
    word: '',
    context: '',
    confidence: 0.8,
  };

  // Permissions utilisateur
  canAddTranslation = false;
  canVote = false;
  currentUserId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private translationService: TranslationService,
    private dictionaryService: DictionaryService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
    this.loadAvailableLanguages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Vérifier les permissions utilisateur
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser?.id || null;
    this.canAddTranslation = this.authService.hasMinimumRole('contributor');
    this.canVote = this.authService.isAuthenticated();
  }

  private setupSubscriptions(): void {
    // S'abonner à l'état des traductions
    this.translationService.translationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.updateComponentState(state);
      });

    // S'abonner aux notifications
    this.translationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        if (notification) {
          this.handleNotification(notification);
        }
      });
  }

  private updateComponentState(state: TranslationState): void {
    this.isLoading = state.loading;
    this.error = state.error;
    this.currentTranslations = state.translations;

    // Mettre à jour les langues disponibles
    if (state.availableLanguages.length > 0) {
      this.availableLanguages =
        this.translationService.filterAvailableLanguageOptions(
          state.availableLanguages
        );
    }

    this.cdr.markForCheck();
  }

  private loadAvailableLanguages(): void {
    if (!this.word?.id) return;

    // D'abord utiliser l'API backend originale qui fonctionne
    this.translationService
      .getAvailableLanguages(this.word.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (languages) => {
          this.availableLanguages =
            this.translationService.filterAvailableLanguageOptions(languages);

          // Si aucune langue n'est trouvée par l'API backend, essayer la détection bidirectionnelle
          if (this.availableLanguages.length === 0) {
            console.log(
              "Aucune langue trouvée par l'API backend, essai de détection bidirectionnelle..."
            );
            this.loadBidirectionalLanguages();
          } else {
            // Sélectionner automatiquement la première langue si disponible
            if (!this.selectedLanguage) {
              const firstAvailable = this.availableLanguages.find(
                (lang) => lang.hasTranslations
              );
              if (firstAvailable) {
                this.selectLanguage(firstAvailable.code);
              }
            }
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error(
            'Erreur API backend, fallback vers détection bidirectionnelle:',
            error
          );
          // En cas d'erreur de l'API backend, utiliser la détection bidirectionnelle
          this.loadBidirectionalLanguages();
        },
      });
  }

  /**
   * Charge les langues disponibles de manière bidirectionnelle
   * Recherche toutes les langues qui ont des traductions liées à ce mot
   */
  private loadBidirectionalLanguages(): void {
    this.isLoading = true;

    // Rechercher tous les mots qui pourraient être des traductions de ce concept
    const wordText = this.word.word;
    const currentLanguage = this.word.language;

    // Faire une recherche globale pour trouver des mots similaires dans d'autres langues
    this.dictionaryService
      .searchWords({
        query: wordText,
        limit: 20,
        page: 1,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          // Analyser les résultats pour détecter les traductions potentielles
          const detectedLanguages = new Set<string>();

          if (results.words) {
            results.words.forEach((word) => {
              // Exclure la langue actuelle
              if (word.language !== currentLanguage) {
                // Vérifier si c'est potentiellement une traduction
                // (même catégorie, signification similaire, etc.)
                if (this.isPotentialTranslation(word, this.word)) {
                  detectedLanguages.add(word.language);
                }
              }
            });
          }

          // Convertir en LanguageOption avec des traductions détectées
          this.availableLanguages = Array.from(detectedLanguages).map(
            (langCode) => {
              const langOption = this.translationService
                .getLanguageOptions()
                .find((opt) => opt.code === langCode);

              return {
                code: langCode,
                name: langOption?.name || langCode.toUpperCase(),
                flag: langOption?.flag || '🌍',
                hasTranslations: true,
                translationCount: 1,
              };
            }
          );

          // Ajouter aussi les langues standard supportées
          const standardLanguages = this.translationService
            .getLanguageOptions()
            .filter((lang) => lang.code !== currentLanguage)
            .map((lang) => ({
              code: lang.code,
              name: lang.name,
              flag: lang.flag || '🌍',
              hasTranslations: detectedLanguages.has(lang.code),
              translationCount: detectedLanguages.has(lang.code) ? 1 : 0,
            }));

          // Fusionner et dédupliquer
          const allLanguages = new Map<string, LanguageOption>();

          // D'abord les langues détectées (priorité)
          this.availableLanguages.forEach((lang) => {
            allLanguages.set(lang.code, lang);
          });

          // Puis les langues standard
          standardLanguages.forEach((lang) => {
            if (!allLanguages.has(lang.code)) {
              allLanguages.set(lang.code, lang);
            }
          });

          this.availableLanguages = Array.from(allLanguages.values());
          this.isLoading = false;

          // Sélectionner automatiquement la première langue avec traductions
          if (this.availableLanguages.length > 0 && !this.selectedLanguage) {
            const firstAvailable = this.availableLanguages.find(
              (lang) => lang.hasTranslations
            );
            if (firstAvailable) {
              this.selectLanguage(firstAvailable.code);
            }
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            'Erreur lors du chargement des langues bidirectionnelles:',
            error
          );
          this.isLoading = false;
          // Fallback vers la méthode originale
          this.loadOriginalAvailableLanguages();
        },
      });
  }

  /**
   * Méthode originale de chargement des langues (fallback)
   */
  private loadOriginalAvailableLanguages(): void {
    this.translationService
      .getAvailableLanguages(this.word.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((languages) => {
        this.availableLanguages =
          this.translationService.filterAvailableLanguageOptions(languages);

        // Sélectionner automatiquement la première langue si disponible
        if (this.availableLanguages.length > 0 && !this.selectedLanguage) {
          const firstAvailable = this.availableLanguages.find(
            (lang) => lang.hasTranslations
          );
          if (firstAvailable) {
            this.selectLanguage(firstAvailable.code);
          }
        }

        this.cdr.markForCheck();
      });
  }

  /**
   * Vérifie si un mot est potentiellement une traduction du mot actuel
   */
  private isPotentialTranslation(candidateWord: any, sourceWord: any): boolean {
    // Critères pour déterminer si c'est une traduction potentielle :

    // 1. Même catégorie (si disponible)
    if (candidateWord.categoryId && sourceWord.categoryId) {
      const candidateCategoryId =
        typeof candidateWord.categoryId === 'object'
          ? candidateWord.categoryId._id || candidateWord.categoryId.id
          : candidateWord.categoryId;
      const sourceCategoryId =
        typeof sourceWord.categoryId === 'object'
          ? sourceWord.categoryId._id || sourceWord.categoryId.id
          : sourceWord.categoryId;

      if (candidateCategoryId === sourceCategoryId) {
        return true;
      }
    }

    // 2. Similarité dans les définitions
    if (candidateWord.meanings && sourceWord.meanings) {
      const candidateDefinitions = this.extractDefinitions(
        candidateWord.meanings
      );
      const sourceDefinitions = this.extractDefinitions(sourceWord.meanings);

      // Recherche de mots-clés communs dans les définitions
      if (this.hasCommonKeywords(candidateDefinitions, sourceDefinitions)) {
        return true;
      }
    }

    // 3. Longueur similaire (heuristique simple)
    const lengthDiff = Math.abs(
      candidateWord.word.length - sourceWord.word.length
    );
    if (lengthDiff <= 3 && candidateWord.word.length >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Extrait toutes les définitions d'un tableau de meanings
   */
  private extractDefinitions(meanings: any[]): string[] {
    const definitions: string[] = [];
    meanings.forEach((meaning) => {
      if (meaning.definitions) {
        meaning.definitions.forEach((def: any) => {
          if (def.definition) {
            definitions.push(def.definition.toLowerCase());
          }
        });
      }
    });
    return definitions;
  }

  /**
   * Vérifie s'il y a des mots-clés communs entre deux ensembles de définitions
   */
  private hasCommonKeywords(
    definitions1: string[],
    definitions2: string[]
  ): boolean {
    const allText1 = definitions1.join(' ').toLowerCase();
    const allText2 = definitions2.join(' ').toLowerCase();

    // Mots-clés importants à rechercher
    const keywords1 = this.extractKeywords(allText1);
    const keywords2 = this.extractKeywords(allText2);

    // Vérifier s'il y a des mots-clés communs
    const commonKeywords = keywords1.filter((keyword) =>
      keywords2.includes(keyword)
    );
    return commonKeywords.length > 0;
  }

  /**
   * Extrait les mots-clés importants d'un texte
   */
  private extractKeywords(text: string): string[] {
    // Mots vides à ignorer
    const stopWords = [
      'le',
      'la',
      'les',
      'un',
      'une',
      'des',
      'du',
      'de',
      'et',
      'ou',
      'mais',
      'donc',
      'car',
      'ni',
      'or',
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];

    return text
      .split(/\s+/)
      .filter((word) => word.length >= 4) // Mots d'au moins 4 caractères
      .filter((word) => !stopWords.includes(word))
      .filter((word) => /^[a-zA-ZÀ-ÿ]+$/.test(word)) // Seulement lettres
      .slice(0, 10); // Maximum 10 mots-clés
  }

  /**
   * Sélectionne une langue et charge ses traductions
   */
  selectLanguage(languageCode: string): void {
    if (this.selectedLanguage === languageCode) return;

    this.selectedLanguage = languageCode;
    this.loadTranslations();
  }

  /**
   * Charge les traductions pour la langue sélectionnée
   */
  private loadTranslations(): void {
    if (!this.word?.id || !this.selectedLanguage) return;

    // D'abord utiliser l'API backend originale qui fonctionne
    this.translationService
      .getTranslation(this.word.id, this.selectedLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // L'API backend met à jour automatiquement le state via translationState$
          // Attendre un peu et vérifier si des traductions ont été chargées
          setTimeout(() => {
            if (
              !this.currentTranslations ||
              this.currentTranslations.length === 0
            ) {
              console.log(
                "Aucune traduction trouvée par l'API backend, essai de détection bidirectionnelle..."
              );
              this.loadBidirectionalTranslations();
            }
          }, 500);
        },
        error: (error) => {
          console.error(
            'Erreur API backend pour traductions, fallback vers détection bidirectionnelle:',
            error
          );
          // En cas d'erreur de l'API backend, utiliser la détection bidirectionnelle
          this.loadBidirectionalTranslations();
        },
      });
  }

  /**
   * Charge les traductions bidirectionnelles pour la langue sélectionnée
   */
  private loadBidirectionalTranslations(): void {
    this.isLoading = true;
    this.currentTranslations = [];

    // Rechercher les mots dans la langue cible qui correspondent à ce concept
    this.findTranslationsInTargetLanguage(this.selectedLanguage!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (translations) => {
          this.currentTranslations = translations;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            'Erreur lors du chargement des traductions bidirectionnelles:',
            error
          );
          this.isLoading = false;
          // Fallback vers la méthode originale
          this.loadOriginalTranslations();
        },
      });
  }

  /**
   * Recherche les traductions dans la langue cible
   */
  private findTranslationsInTargetLanguage(
    targetLanguage: string
  ): Observable<Translation[]> {
    const wordText = this.word.word;

    // Faire une recherche ciblée dans la langue sélectionnée
    return this.dictionaryService
      .searchWords({
        query: wordText,
        languages: [targetLanguage],
        limit: 10,
        page: 1,
      })
      .pipe(
        map((results) => {
          const translations: Translation[] = [];

          if (results.words && results.words.length > 0) {
            results.words.forEach((targetWord) => {
              // Vérifier si c'est vraiment une traduction de notre concept
              if (this.isPotentialTranslation(targetWord, this.word)) {
                // Créer un objet Translation à partir du mot trouvé
                const translation: Translation = {
                  id:
                    targetWord.id ||
                    (targetWord as any)._id ||
                    `generated_${Date.now()}_${Math.random()}`,
                  language: targetWord.language,
                  translatedWord: targetWord.word,
                  context: this.extractContextFromWord(targetWord),
                  confidence: this.calculateConfidenceScore(
                    targetWord,
                    this.word
                  ),
                  votes: 0, // Par défaut, pourrait être récupéré d'une vraie DB de traductions
                  validationType: 'auto', // Détection automatique
                  targetWordId: targetWord.id || (targetWord as any)._id,
                  createdAt: new Date(),
                  createdBy: {
                    id: 'system',
                    username: 'Système',
                  },
                };

                translations.push(translation);
              }
            });
          }

          // Trier par score de confiance
          return translations.sort((a, b) => b.confidence - a.confidence);
        }),
        catchError((error) => {
          console.error('Erreur dans findTranslationsInTargetLanguage:', error);
          return of([]);
        })
      );
  }

  /**
   * Extrait le contexte d'un mot pour l'utiliser dans la traduction
   */
  private extractContextFromWord(word: any): string[] {
    const contexts: string[] = [];

    // Ajouter la catégorie comme contexte
    if (word.categoryId) {
      const categoryName =
        typeof word.categoryId === 'object'
          ? word.categoryId.name
          : word.categoryId;
      if (categoryName) {
        contexts.push(categoryName);
      }
    }

    // Ajouter la partie du discours principale
    if (word.meanings && word.meanings.length > 0) {
      const firstMeaning = word.meanings[0];
      if (firstMeaning.partOfSpeech) {
        contexts.push(firstMeaning.partOfSpeech);
      }
    }

    return contexts;
  }

  /**
   * Calcule un score de confiance basé sur la similitude entre deux mots
   */
  private calculateConfidenceScore(targetWord: any, sourceWord: any): number {
    let score = 0.5; // Score de base

    // Bonus pour même catégorie
    if (targetWord.categoryId && sourceWord.categoryId) {
      const targetCategoryId =
        typeof targetWord.categoryId === 'object'
          ? targetWord.categoryId._id || targetWord.categoryId.id
          : targetWord.categoryId;
      const sourceCategoryId =
        typeof sourceWord.categoryId === 'object'
          ? sourceWord.categoryId._id || sourceWord.categoryId.id
          : sourceWord.categoryId;

      if (targetCategoryId === sourceCategoryId) {
        score += 0.3; // +30% pour même catégorie
      }
    }

    // Bonus pour similarité des définitions
    if (targetWord.meanings && sourceWord.meanings) {
      const targetDefinitions = this.extractDefinitions(targetWord.meanings);
      const sourceDefinitions = this.extractDefinitions(sourceWord.meanings);

      if (this.hasCommonKeywords(targetDefinitions, sourceDefinitions)) {
        score += 0.2; // +20% pour mots-clés communs
      }
    }

    // Bonus pour longueur similaire
    const lengthDiff = Math.abs(
      targetWord.word.length - sourceWord.word.length
    );
    if (lengthDiff <= 2) {
      score += 0.1; // +10% pour longueur similaire
    }

    // S'assurer que le score est entre 0 et 1
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Méthode originale de chargement des traductions (fallback)
   */
  private loadOriginalTranslations(): void {
    this.translationService
      .getTranslation(this.word.id, this.selectedLanguage!)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Ouvre la modal d'ajout de traduction
   */
  openAddTranslationModal(): void {
    if (!this.canAddTranslation || !this.selectedLanguage) return;

    this.showAddModal = true;
    this.resetNewTranslationForm();
  }

  /**
   * Ferme la modal d'ajout de traduction
   */
  closeAddTranslationModal(): void {
    this.showAddModal = false;
    this.resetNewTranslationForm();
  }

  /**
   * Soumet une nouvelle traduction
   */
  submitNewTranslation(): void {
    if (!this.isValidNewTranslation()) return;

    const request: CreateTranslationRequest = {
      sourceWordId: this.word.id,
      targetLanguage: this.selectedLanguage!,
      translatedWord: this.newTranslation.word.trim(),
      context: this.newTranslation.context.trim()
        ? [this.newTranslation.context.trim()]
        : undefined,
      confidence: this.newTranslation.confidence,
    };

    this.translationService
      .createTranslation(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.success) {
            this.closeAddTranslationModal();
            this.loadTranslations(); // Recharger les traductions
          } else if (result.action === 'uncertain') {
            // Gérer le cas de similarité détectée
            this.handleSimilarityDetected();
          }
        },
        error: (error) => {
          console.error("Erreur lors de l'ajout de la traduction:", error);
        },
      });
  }

  /**
   * Vote pour une traduction
   */
  voteForTranslation(translation: Translation, voteValue: number): void {
    if (!this.canVote || !this.currentUserId) return;

    // Vérifier si l'utilisateur a déjà voté (côté client)
    // Note: cette vérification sera aussi faite côté serveur

    const request: VoteTranslationRequest = {
      voteValue,
      comment: undefined,
    };

    this.translationService
      .voteForTranslation(translation.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Le vote a été enregistré, l'état sera mis à jour automatiquement
        },
        error: (error) => {
          console.error('Erreur lors du vote:', error);
        },
      });
  }

  /**
   * Retourne le nom lisible d'une langue
   */
  getLanguageName(code: string): string {
    const option = this.translationService
      .getLanguageOptions()
      .find((opt) => opt.code === code);
    return option?.name || code.toUpperCase();
  }

  /**
   * Retourne l'emoji du drapeau pour une langue
   */
  getLanguageFlag(code: string): string {
    const option = this.translationService
      .getLanguageOptions()
      .find((opt) => opt.code === code);
    return option?.flag || '🌍';
  }

  /**
   * Vérifie si l'utilisateur peut voter pour une traduction
   */
  canVoteForTranslation(translation: Translation): boolean {
    if (!this.canVote || !this.currentUserId) return false;

    // Ne peut pas voter pour ses propres traductions
    if (translation.createdBy?.id === this.currentUserId) return false;

    // Vérifier si déjà voté (cette logique pourrait être améliorée)
    return true;
  }

  /**
   * Retourne la classe CSS pour le score de confiance
   */
  getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Retourne la classe CSS pour le type de validation
   */
  getValidationTypeClass(type: string): string {
    switch (type) {
      case 'auto':
        return 'validation-auto';
      case 'learned':
        return 'validation-learned';
      default:
        return 'validation-manual';
    }
  }

  /**
   * Formate la date de création
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Méthodes privées

  private resetNewTranslationForm(): void {
    this.newTranslation = {
      word: '',
      context: '',
      confidence: 0.8,
    };
  }

  // Méthode rendue publique pour le template
  isValidNewTranslation(): boolean {
    return (
      this.newTranslation.word.trim().length > 0 &&
      this.newTranslation.confidence >= 0 &&
      this.newTranslation.confidence <= 1
    );
  }

  private handleSimilarityDetected(): void {
    // Cette méthode pourrait ouvrir une modal spécialisée pour gérer les similarités
    // Pour l'instant, on ferme simplement la modal
    this.closeAddTranslationModal();

    // On pourrait implémenter une modal de confirmation ici
    console.log(
      'Similarité détectée - implémentation de la modal de confirmation à faire'
    );
  }

  private handleNotification(notification: any): void {
    // Cette méthode pourrait afficher des toasts ou autres notifications
    // Pour l'instant, on log simplement
    console.log('Notification de traduction:', notification);
  }

  /**
   * Fonction de suivi pour *ngFor (optimisation performance)
   */
  trackByTranslationId(index: number, translation: Translation): string {
    return translation.id;
  }

  // Transformer AvailableLanguage[] en DropdownOption[] pour le custom-dropdown
  get dropdownLanguageOptions(): DropdownOption[] {
    return this.availableLanguages.map((lang) => ({
      value: lang.code,
      label: `${this.getLanguageFlag(lang.code)} ${lang.name} ${
        lang.translationCount && lang.translationCount > 0
          ? `(${lang.translationCount})`
          : ''
      }`,
    }));
  }

  // Handler pour le changement de sélection du dropdown
  onLanguageSelectionChange(selectedValues: string[]): void {
    if (selectedValues && selectedValues.length > 0) {
      this.selectLanguage(selectedValues[0]); // Prendre le premier élément
    }
  }

  /**
   * Navigue vers la page de détails du mot traduit
   */
  navigateToTranslationDetails(translation: Translation): void {
    if (translation.targetWordId) {
      // Si on a l'ID du mot traduit, naviguer directement
      this.router.navigate(['/dictionary/word', translation.targetWordId]);
    } else {
      // Rechercher le mot par nom et langue pour obtenir son ID
      this.dictionaryService
        .searchWords({
          query: translation.translatedWord,
          languages: [translation.language],
          limit: 1,
          page: 1,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (results) => {
            if (results.words && results.words.length > 0) {
              // Trouver le mot exact (correspondance parfaite)
              const exactMatch = results.words.find(
                (word) =>
                  word.word.toLowerCase() ===
                    translation.translatedWord.toLowerCase() &&
                  word.language === translation.language
              );

              if (exactMatch) {
                const wordId = exactMatch.id || (exactMatch as any)._id;
                this.router.navigate(['/dictionary/word', wordId]);
              } else {
                // Si pas de correspondance exacte, prendre le premier résultat
                const firstWord = results.words[0];
                const wordId = firstWord.id || (firstWord as any)._id;
                this.router.navigate(['/dictionary/word', wordId]);
              }
            } else {
              // Aucun mot trouvé, fallback vers la recherche
              this.router.navigate(['/dictionary'], {
                queryParams: {
                  search: translation.translatedWord,
                  language: translation.language,
                },
              });
            }
          },
          error: (error) => {
            console.error('Erreur lors de la recherche du mot:', error);
            // En cas d'erreur, fallback vers la recherche
            this.router.navigate(['/dictionary'], {
              queryParams: {
                search: translation.translatedWord,
                language: translation.language,
              },
            });
          },
        });
    }
  }
}
