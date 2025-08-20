import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { Category } from '../../../../core/models/category';

@Component({
  selector: 'app-add-word',
  standalone: false,
  templateUrl: './add-word.component.html',
  styleUrls: ['./add-word.component.scss'],
})
export class AddWordComponent implements OnInit, OnDestroy {
  wordForm: FormGroup;
  categories: Category[] = [];
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // ✨ NOUVEAU : Langues chargées dynamiquement depuis la base de données
  languages: {
    id: string;
    code: string;
    name: string;
    nativeName?: string;
    wordCount?: number;
  }[] = [];

  // Propriétés pour le système de traduction intelligente
  similarWords: any[] = [];
  isCheckingSimilarity = false;
  showSimilarityWarning = false;
  selectedSimilarWord: any = null;
  showTranslationSection = false;

  // Propriétés pour la recherche de mots existants
  translationWordSearch: { [key: number]: string } = {};
  translationWordResults: { [key: number]: any[] } = {};
  isSearchingTranslationWords: { [key: number]: boolean } = {};
  selectedTranslationWords: { [key: number]: any } = {};

  // Options pour les parties du discours
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

  informationRecue = '';

  audioFile: File | null = null;
  audioFileName: string = '';
  audioPreviewUrl: string | null = null;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  constructor(
    private _fb: FormBuilder,
    private _dictionaryService: DictionaryService,
    private _router: Router,
    private _route: ActivatedRoute
  ) {
    // Initialisation du formulaire
    this.wordForm = this._fb.group({
      word: ['', [Validators.required, Validators.minLength(1)]],
      languageId: ['', Validators.required], // ✨ NOUVEAU : utilisation de languageId
      language: [''], // ✨ TRANSITION : garde l'ancien champ pour compatibilité
      pronunciation: [''],
      etymology: [''],
      categoryId: [''],
      meanings: this._fb.array([this.createMeaning()]),
      translations: this._fb.array([]),
    });
  }

  ngOnInit(): void {
    // ✨ NOUVEAU : Charger les langues disponibles depuis la base de données
    this.loadAvailableLanguages();

    // ✨ NOUVEAU : Gestion des paramètres de retour depuis add-category
    this._route.queryParams
      .pipe(takeUntil(this._destroy$))
      .subscribe((params) => {
        // Gestion du contexte de langue depuis URL
        if (params['languageId']) {
          this.wordForm.patchValue({
            languageId: params['languageId'],
          });
        }

        // Gestion des notifications de retour
        if (params['categoryProposed'] === 'true') {
          this.successMessage =
            params['message'] ||
            'Catégorie proposée avec succès ! Elle sera disponible après approbation.';
          console.log('✅ Notification reçue: catégorie proposée');
        }
      });

    // Chargement des catégories au démarrage
    this.wordForm.get('categoryId')?.valueChanges.subscribe((categoryId) => {
      this.informationRecue += categoryId;
    });
    // Ajout d'un écouteur pour le changement de langue
    this.wordForm
      .get('languageId')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe((selectedLanguageId) => {
        if (selectedLanguageId) {
          this.informationRecue += selectedLanguageId;
          // Trouver la langue correspondante et son code pour charger les catégories
          const selectedLanguage = this.languages.find(
            (lang) => lang.id === selectedLanguageId
          );
          if (selectedLanguage) {
            console.log('🔍 Loading categories for language:', {
              id: selectedLanguage.id,
              code: selectedLanguage.code,
              name: selectedLanguage.name,
            });
            // Utiliser l'ID de la langue au lieu du code qui peut être manquant
            this._loadCategoriesByLanguage(selectedLanguage.id);
            // Synchroniser l'ancien champ language pour compatibilité
            this.wordForm
              .get('language')
              ?.setValue(selectedLanguage.code || selectedLanguage.id, {
                emitEvent: false,
              });
          } else {
            console.warn('⚠️ Selected language not found:', selectedLanguageId);
          }
        } else {
          // Si aucune langue n'est sélectionnée, vider la liste des catégories
          this.categories = [];
          this.wordForm.get('language')?.setValue('', { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // Getters pour accéder aux contrôles du formulaire
  get meanings(): FormArray {
    return this.wordForm.get('meanings') as FormArray;
  }

  get translations(): FormArray {
    return this.wordForm.get('translations') as FormArray;
  }

  // Création d'un nouveau contrôle de sens
  createMeaning(): FormGroup {
    return this._fb.group({
      partOfSpeech: ['', Validators.required],
      definitions: this._fb.array([this.createDefinition()]),
      synonyms: [''], // String avec valeurs séparées par des virgules
      antonyms: [''], // String avec valeurs séparées par des virgules
      examples: [''], // String avec valeurs séparées par des virgules
    });
  }

  // Création d'un nouveau contrôle de définition
  createDefinition(): FormGroup {
    return this._fb.group({
      definition: ['', Validators.required],
      examples: [''], // String avec valeurs séparées par des virgules
    });
  }

  // Récupérer les définitions d'un sens donné
  getDefinitions(meaningIndex: number): FormArray {
    return this.meanings.at(meaningIndex).get('definitions') as FormArray;
  }

  // Ajouter un nouveau sens
  addMeaning(): void {
    this.meanings.push(this.createMeaning());
  }

  // Supprimer un sens
  removeMeaning(index: number): void {
    if (this.meanings.length > 1) {
      this.meanings.removeAt(index);
    }
  }

  // Ajouter une nouvelle définition à un sens
  addDefinition(meaningIndex: number): void {
    const definitions = this.getDefinitions(meaningIndex);
    definitions.push(this.createDefinition());
  }

  // Supprimer une définition d'un sens
  removeDefinition(meaningIndex: number, definitionIndex: number): void {
    const definitions = this.getDefinitions(meaningIndex);
    if (definitions.length > 1) {
      definitions.removeAt(definitionIndex);
    }
  }

  // Conversion des chaînes séparées par des virgules en tableaux
  private _parseCommaSeparatedString(value: string): string[] {
    if (!value || value.trim() === '') {
      return [];
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  // Préparation des données avant soumission
  private _prepareSubmitData(): any {
    const formData = { ...this.wordForm.value };

    // Suppression de categoryId s'il est undefined ou vide
    if (!formData.categoryId || formData.categoryId === '') {
      delete formData.categoryId;
    }

    // Conversion des meanings
    formData.meanings = formData.meanings.map((meaning: any) => {
      // Conversion des chaînes en tableaux
      meaning.synonyms = this._parseCommaSeparatedString(meaning.synonyms);
      meaning.antonyms = this._parseCommaSeparatedString(meaning.antonyms);
      meaning.examples = this._parseCommaSeparatedString(meaning.examples);

      // Conversion des définitions
      meaning.definitions = meaning.definitions.map((def: any) => {
        def.examples = this._parseCommaSeparatedString(def.examples);
        return def;
      });

      return meaning;
    });

    // Nettoyage des translations - suppression des propriétés non autorisées
    if (formData.translations && formData.translations.length > 0) {
      formData.translations = formData.translations
        .filter(
          (translation: any) =>
            (translation.languageId || translation.language) &&
            translation.translatedWord
        )
        .map((translation: any) => {
          // Supprimer les propriétés non autorisées par le backend
          const {
            targetWordId,
            searchTerm,
            selectedWordId,
            ...cleanTranslation
          } = translation;

          // Convertir context string en tableau si nécessaire
          if (
            cleanTranslation.context &&
            typeof cleanTranslation.context === 'string'
          ) {
            const contextStr = cleanTranslation.context.trim();
            if (contextStr) {
              // Séparer par virgules et nettoyer
              cleanTranslation.context = contextStr
                .split(',')
                .map((item: string) => item.trim())
                .filter((item: string) => item !== '');
            } else {
              // Contexte vide, supprimer la propriété
              delete cleanTranslation.context;
            }
          } else if (
            !cleanTranslation.context ||
            (Array.isArray(cleanTranslation.context) &&
              cleanTranslation.context.length === 0)
          ) {
            // Supprimer context s'il est vide
            delete cleanTranslation.context;
          }

          return cleanTranslation;
        });
    }

    return formData;
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.wordForm.invalid) {
      this._markFormGroupTouched(this.wordForm);
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const submitData = this._prepareSubmitData();

    console.log('Submit data prepared:', submitData);

    // Si un fichier audio est présent, on utilise FormData
    if (this.audioFile) {
      const formData = new FormData();

      // S'assurer que les champs requis ne sont pas vides
      if (!submitData.word || submitData.word.trim() === '') {
        this.errorMessage = 'Le mot est requis';
        this.isSubmitting = false;
        return;
      }

      if (!submitData.languageId || submitData.languageId.trim() === '') {
        this.errorMessage = 'La langue est requise';
        this.isSubmitting = false;
        return;
      }

      // Validation des meanings
      if (
        !submitData.meanings ||
        !Array.isArray(submitData.meanings) ||
        submitData.meanings.length === 0
      ) {
        this.errorMessage = 'Au moins une signification est requise';
        this.isSubmitting = false;
        return;
      }

      // Validation de chaque meaning
      for (let i = 0; i < submitData.meanings.length; i++) {
        const meaning = submitData.meanings[i];
        if (!meaning.partOfSpeech || meaning.partOfSpeech.trim() === '') {
          this.errorMessage = `La partie du discours est requise pour le sens #${
            i + 1
          }`;
          this.isSubmitting = false;
          return;
        }

        if (
          !meaning.definitions ||
          !Array.isArray(meaning.definitions) ||
          meaning.definitions.length === 0
        ) {
          this.errorMessage = `Au moins une définition est requise pour le sens #${
            i + 1
          }`;
          this.isSubmitting = false;
          return;
        }

        for (let j = 0; j < meaning.definitions.length; j++) {
          const definition = meaning.definitions[j];
          if (!definition.definition || definition.definition.trim() === '') {
            this.errorMessage = `La définition #${j + 1} du sens #${
              i + 1
            } ne peut pas être vide`;
            this.isSubmitting = false;
            return;
          }
        }
      }

      // Construction du FormData avec validation
      formData.append('word', submitData.word.trim());
      formData.append('languageId', submitData.languageId.trim());
      // Conserver language pour compatibilité pendant la transition
      if (submitData.language) {
        formData.append('language', submitData.language.trim());
      }
      formData.append('pronunciation', submitData.pronunciation || '');
      formData.append('etymology', submitData.etymology || '');

      if (submitData.categoryId && submitData.categoryId.trim() !== '') {
        formData.append('categoryId', submitData.categoryId.trim());
      }

      // Stringifier les meanings avec validation
      try {
        const meaningsJson = JSON.stringify(submitData.meanings);
        formData.append('meanings', meaningsJson);
        console.log('Meanings JSON:', meaningsJson);
      } catch (error) {
        this.errorMessage = 'Erreur lors de la préparation des significations';
        this.isSubmitting = false;
        return;
      }

      formData.append('audioFile', this.audioFile);

      console.log('FormData prepared, submitting...');

      // !Log pour debug (ne pas faire en production)
      for (let pair of formData.entries()) {
        console.log(
          pair[0] + ': ' + (pair[1] instanceof File ? 'FILE' : pair[1])
        );
      }

      this._dictionaryService
        .submitWord(formData)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (word) => {
            this.isSubmitting = false;
            if (word) {
              this.successMessage = 'Le mot a été ajouté avec succès!';
              this._resetForm();
              setTimeout(() => {
                this._router.navigate(['/dictionary/word', word.id]);
              }, 2000);
            } else {
              this.errorMessage =
                "Une erreur est survenue lors de l'ajout du mot";
            }
          },
          error: (error) => {
            this.isSubmitting = false;
            console.error('Error submitting word:', error);

            // Gestion d'erreur améliorée
            if (error.error && error.error.message) {
              if (Array.isArray(error.error.message)) {
                this.errorMessage = error.error.message.join(', ');
              } else {
                this.errorMessage = error.error.message;
              }
            } else if (error.message) {
              this.errorMessage = error.message;
            } else {
              this.errorMessage =
                "Une erreur est survenue lors de l'ajout du mot";
            }
          },
        });

      return;
    }

    // ?Soumission classique sans fichier audio
    this._dictionaryService
      .submitWord(submitData)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (word) => {
          this.isSubmitting = false;
          if (word) {
            this.successMessage = 'Le mot a été ajouté avec succès!';
            this._resetForm();
            setTimeout(() => {
              this._router.navigate(['/dictionary/word', word.id]);
            }, 2000);
          } else {
            this.errorMessage =
              "Une erreur est survenue lors de l'ajout du mot";
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error submitting word:', error);

          if (error.error && error.error.message) {
            if (Array.isArray(error.error.message)) {
              this.errorMessage = error.error.message.join(', ');
            } else {
              this.errorMessage = error.error.message;
            }
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage =
              "Une erreur est survenue lors de l'ajout du mot";
          }
        },
      });
  }

  // Méthode utilitaire pour marquer tous les contrôles comme touchés
  private _markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);

      if (control instanceof FormControl) {
        control.markAsTouched();
      } else if (control instanceof FormGroup || control instanceof FormArray) {
        this._markFormGroupTouched(control);
      }
    });
  }

  // Méthode pour charger les catégories par langue
  // Cette méthode est appelée lorsque la langue change dans le formulaire
  // Elle utilise le service DictionaryService pour récupérer les catégories
  private _loadCategoriesByLanguage(languageIdOrCode: string): void {
    console.log(
      '📦 Chargement des catégories pour la langue:',
      languageIdOrCode
    );
    this._dictionaryService
      .getCategories(languageIdOrCode)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (categoriesFromApi) => {
          console.log('📦 Catégories reçues du backend:', categoriesFromApi);
          this.categories = categoriesFromApi.map((cat) => ({
            _id: cat._id as string,
            id: cat._id as string,
            name: cat.name,
            description: cat.description,
            language: cat.language,
          }));
          console.log('✅ Catégories mappées:', this.categories);

          // Vérifier si la catégorie actuelle est toujours valide
          const currentCategoryId = this.wordForm.get('categoryId')?.value;
          console.log('Current category: ' + currentCategoryId);

          if (
            currentCategoryId &&
            !this.categories.some((cat) => cat._id === currentCategoryId)
          ) {
            this.wordForm.get('categoryId')?.setValue('');
          }
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des catégories:', error);
          this.categories = [];
        },
      });
  }

  // Méthode pour réinitialiser le formulaire
  private _resetForm(): void {
    // Réinitialiser les contrôles simples
    this.wordForm.patchValue({
      word: '',
      languageId: '',
      language: '',
      pronunciation: '',
      etymology: '',
      categoryId: '',
    });

    // Réinitialiser les tableaux de formGroup
    const meaningsArray = this.wordForm.get('meanings') as FormArray;

    // Garder seulement le premier meaning et le réinitialiser
    while (meaningsArray.length > 0) {
      meaningsArray.removeAt(0);
    }

    // Ajouter un nouveau meaning vierge
    meaningsArray.push(this.createMeaning());

    // Marquer le formulaire comme pristine et untouched
    this.wordForm.markAsPristine();
    this.wordForm.markAsUntouched();
  }

  onAudioFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.audioFile = input.files[0];
      this.audioFileName = this.audioFile.name;
      this.audioPreviewUrl = URL.createObjectURL(this.audioFile);
    }
  }

  playAudio() {
    if (this.audioPlayer && this.audioPreviewUrl) {
      this.audioPlayer.nativeElement.play();
    }
  }

  // Méthodes pour la gestion des traductions
  toggleTranslationSection(): void {
    this.showTranslationSection = !this.showTranslationSection;
  }

  createTranslation(): FormGroup {
    return this._fb.group({
      languageId: ['', Validators.required], // ✨ NOUVEAU : utilisation de languageId
      language: [''], // ✨ TRANSITION : garde l'ancien champ pour compatibilité
      translatedWord: ['', Validators.required],
      context: [''],
      confidence: [0.8, [Validators.min(0), Validators.max(1)]],
    });
  }

  addTranslation(): void {
    this.translations.push(this.createTranslation());
  }

  removeTranslation(index: number): void {
    this.translations.removeAt(index);
  }

  getAvailableLanguagesForTranslation(index: number): any[] {
    const sourceLanguageId = this.wordForm.get('languageId')?.value;
    return this.languages.filter((lang) => lang.id !== sourceLanguageId);
  }

  getLanguageName(code: string): string {
    const language = this.languages.find((lang) => lang.code === code);
    return language ? language.name : code;
  }

  getLanguageNameById(id: string): string {
    const language = this.languages.find((lang) => lang.id === id);
    return language ? language.name : id;
  }

  getLanguageCodeById(id: string): string {
    const language = this.languages.find((lang) => lang.id === id);
    return language ? language.code : '';
  }

  // Méthode de tracking pour optimiser le rendu
  trackByLanguageId(index: number, language: any): string {
    return language.id;
  }

  // Méthodes pour la recherche de mots existants
  searchWordsInTargetLanguage(
    translationIndex: number,
    language: string,
    searchTerm: string
  ): void {
    if (!searchTerm || searchTerm.length < 2) {
      this.translationWordResults[translationIndex] = [];
      return;
    }

    if (!language) {
      return;
    }

    this.isSearchingTranslationWords[translationIndex] = true;

    // Appel API réel pour chercher des mots existants
    this._dictionaryService
      .searchWords({
        query: searchTerm,
        languages: [language],
        limit: 10,
        page: 1,
      })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (results) => {
          this.translationWordResults[translationIndex] = results.words || [];
          this.isSearchingTranslationWords[translationIndex] = false;
          console.log(
            `🔍 Trouvé ${
              results.words?.length || 0
            } mots en ${language} pour "${searchTerm}":`,
            results.words
          );
        },
        error: (error) => {
          console.error('❌ Erreur lors de la recherche de mots:', error);
          this.translationWordResults[translationIndex] = [];
          this.isSearchingTranslationWords[translationIndex] = false;
        },
      });
  }

  selectTranslationWord(translationIndex: number, word: any): void {
    this.selectedTranslationWords[translationIndex] = word;

    const translationControl = this.translations.at(translationIndex);
    translationControl.patchValue({
      translatedWord: word.word,
    });

    this.translationWordResults[translationIndex] = [];
    this.translationWordSearch[translationIndex] = word.word;
  }

  onTranslationLanguageChange(translationIndex: number): void {
    this.translationWordSearch[translationIndex] = '';
    this.translationWordResults[translationIndex] = [];
    this.selectedTranslationWords[translationIndex] = null;

    const translationControl = this.translations.at(translationIndex);
    const selectedLanguageId = translationControl.get('languageId')?.value;

    // Synchroniser l'ancien champ language pour compatibilité
    if (selectedLanguageId) {
      const selectedLanguage = this.languages.find(
        (lang) => lang.id === selectedLanguageId
      );
      if (selectedLanguage) {
        translationControl.patchValue(
          {
            language: selectedLanguage.code,
            translatedWord: '',
            targetWordId: null,
          },
          { emitEvent: false }
        );
      }
    } else {
      translationControl.patchValue(
        {
          language: '',
          translatedWord: '',
          targetWordId: null,
        },
        { emitEvent: false }
      );
    }
  }

  // Méthodes pour les suggestions de similarité
  selectSimilarWord(suggestion: any): void {
    this.selectedSimilarWord = suggestion;
  }

  ignoreSuggestions(): void {
    this.showSimilarityWarning = false;
    this.similarWords = [];
  }

  /**
   * ✨ NOUVELLE MÉTHODE : Charge les langues disponibles depuis la base de données
   */
  private loadAvailableLanguages(): void {
    console.log("🔄 Tentative de chargement des langues depuis l'API...");

    this._dictionaryService
      .getAvailableLanguages()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (languages) => {
          console.log("✅ Langues reçues depuis l'API:", languages);
          this.languages = languages;
          console.log(
            '🌍 Langues disponibles chargées dans le composant:',
            this.languages
          );
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des langues:', error);
          console.log('🔄 Utilisation du fallback...');
          // Fallback vers une liste par défaut si l'API ne répond pas
          this.languages = [
            { id: 'fallback-fr', code: 'fr', name: 'Français', wordCount: 42 },
            { id: 'fallback-en', code: 'en', name: 'Anglais', wordCount: 28 },
            { id: 'fallback-es', code: 'es', name: 'Espagnol', wordCount: 15 },
            { id: 'fallback-de', code: 'de', name: 'Allemand', wordCount: 8 },
          ];
          console.log('🌍 Langues fallback chargées:', this.languages);
        },
      });
  }

  // Méthode pour obtenir les paramètres contextuels pour ajouter une catégorie
  getAddCategoryParams(): any {
    const selectedLanguageId = this.wordForm.get('languageId')?.value;
    const selectedLanguage = this.languages.find(
      (lang) => lang.id === selectedLanguageId
    );

    if (selectedLanguageId && selectedLanguage) {
      console.log(
        '🎯 Navigation contextuelle vers add-category avec langue:',
        selectedLanguage
      );
      return {
        languageId: selectedLanguageId,
        returnTo: 'add-word',
      };
    }

    console.log('⚠️ Aucune langue sélectionnée pour le contexte add-category');
    return {};
  }
}
