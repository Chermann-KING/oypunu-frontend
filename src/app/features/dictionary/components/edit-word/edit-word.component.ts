import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable, of } from 'rxjs';
import {
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';
import {
  DictionaryService,
  UpdateWordDto,
} from '../../../../core/services/dictionary.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { Word } from '../../../../core/models/word';
import { AuthService } from '../../../../core/services/auth.service';
import {
  LanguageOption,
  TranslationSuggestion,
  CreateTranslationRequest,
} from '../../../../core/models/translation';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-edit-word',
  standalone: false,
  templateUrl: './edit-word.component.html',
  styleUrls: ['./edit-word.component.scss'],
})
export class EditWordComponent implements OnInit, OnDestroy {
  editWordForm: FormGroup;
  word: Word | null = null;
  wordId: string = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  canEdit = false;
  audioFile: File | null = null;
  audioAccent = 'fr-FR';
  isUploadingAudio = false;

  // Nouvelles propriétés pour le système de traduction intelligente
  private _destroy$ = new Subject<void>();
  availableLanguages: LanguageOption[] = [];
  translationSearchResults: { [key: number]: Word[] } = {}; // Résultats de recherche par index de traduction
  isSearchingWords: { [key: number]: boolean } = {}; // État de recherche par index
  selectedTranslationWords: { [key: number]: Word | null } = {}; // Mots sélectionnés par index
  showCreateWordOptions: { [key: number]: boolean } = {}; // Affichage options de création par index

  constructor(
    private _fb: FormBuilder,
    private _dictionaryService: DictionaryService,
    private _translationService: TranslationService,
    private _authService: AuthService,
    private _route: ActivatedRoute,
    private _router: Router,
    private _http: HttpClient
  ) {
    this.editWordForm = this._fb.group({
      pronunciation: [''],
      etymology: [''],
      meanings: this._fb.array([]),
      translations: this._fb.array([]),
      revisionNotes: [''],
      forceRevision: [false],
    });
  }

  ngOnInit(): void {
    this.wordId = this._route.snapshot.paramMap.get('id') || '';
    this.loadAvailableLanguages();
    if (this.wordId) {
      this.loadWord();
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private loadWord(): void {
    this.isLoading = true;
    this._dictionaryService.getWordById(this.wordId).subscribe({
      next: (word: Word | null) => {
        if (word) {
          this.word = word;
          this.populateForm(word);
          this.checkEditPermissions();
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        this.errorMessage = 'Erreur lors du chargement du mot';
        this.isLoading = false;
        console.error('Error loading word:', error);
      },
    });
  }

  private checkEditPermissions(): void {
    const currentUser = this._authService.getCurrentUser();
    this.canEdit = false;

    if (currentUser && this.word) {
      if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
        this.canEdit = true;
        this.errorMessage = '';
        return;
      }

      const createdById =
        this.word.createdBy && typeof this.word.createdBy === 'object'
          ? (this.word.createdBy as any)._id || (this.word.createdBy as any).id
          : this.word.createdBy;

      if (
        createdById &&
        (currentUser as any)._id &&
        createdById === (currentUser as any)._id &&
        this.word.status !== 'rejected'
      ) {
        this.canEdit = true;
        this.errorMessage = '';
        return;
      }
    }

    if (!this.canEdit) {
      this.errorMessage = "Vous n'avez pas le droit de modifier ce mot.";
    }
  }

  private populateForm(word: Word): void {
    this.editWordForm.patchValue({
      pronunciation: word.pronunciation || '',
      etymology: word.etymology || '',
      revisionNotes: '',
    });

    // Populate meanings
    const meaningsArray = this.editWordForm.get('meanings') as FormArray;
    meaningsArray.clear();
    if (word.meanings && Array.isArray(word.meanings)) {
      word.meanings.forEach((meaning: any) => {
        meaningsArray.push(this.createMeaningFormGroup(meaning));
      });
    }

    // Populate translations
    const translationsArray = this.editWordForm.get(
      'translations'
    ) as FormArray;
    translationsArray.clear();
    if (
      (word as any).translations &&
      Array.isArray((word as any).translations)
    ) {
      (word as any).translations.forEach((translation: any) => {
        translationsArray.push(this.createTranslationFormGroup(translation));
      });
    }
  }

  private createMeaningFormGroup(meaning?: any): FormGroup {
    return this._fb.group({
      partOfSpeech: [meaning?.partOfSpeech || '', Validators.required],
      definitions: this._fb.array(
        meaning?.definitions?.map((def: any) =>
          this.createDefinitionFormGroup(def)
        ) || []
      ),
      synonyms: this._fb.array(meaning?.synonyms || []),
      antonyms: this._fb.array(meaning?.antonyms || []),
      examples: this._fb.array(meaning?.examples || []),
    });
  }

  private createDefinitionFormGroup(definition?: any): FormGroup {
    return this._fb.group({
      definition: [definition?.definition || '', Validators.required],
      examples: this._fb.array(definition?.examples || []),
      sourceUrl: [definition?.sourceUrl || ''],
    });
  }

  private createTranslationFormGroup(translation?: any): FormGroup {
    const group = this._fb.group({
      language: [translation?.language || '', Validators.required],
      translatedWord: [translation?.translatedWord || '', Validators.required],
      context: this._fb.array(translation?.context || []),
      confidence: [translation?.confidence || 0],
      verifiedBy: this._fb.array(translation?.verifiedBy || []),
      // Nouveaux champs pour la recherche intelligente
      searchTerm: [''], // Champ de recherche temporaire
      selectedWordId: [translation?.selectedWordId || null], // ID du mot sélectionné
    });

    // Écouter les changements sur le champ de recherche pour déclencher la recherche
    const translationIndex = this.translationsArray.length;
    group
      .get('searchTerm')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this._destroy$)
      )
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.length >= 2) {
          const language = group.get('language')?.value;
          if (language) {
            this.searchWordsInLanguage(translationIndex, language, searchTerm);
          }
        } else {
          this.clearSearchResults(translationIndex);
        }
      });

    return group;
  }

  get meaningsArray(): FormArray {
    return this.editWordForm.get('meanings') as FormArray;
  }

  get translationsArray(): FormArray {
    return this.editWordForm.get('translations') as FormArray;
  }

  // Méthodes getter pour accéder aux FormArray de manière sûre
  getDefinitionsArray(meaningIndex: number): FormArray {
    const meaning = this.meaningsArray.at(meaningIndex);
    return meaning.get('definitions') as FormArray;
  }

  getSynonymsArray(meaningIndex: number): FormArray {
    const meaning = this.meaningsArray.at(meaningIndex);
    return meaning.get('synonyms') as FormArray;
  }

  getAntonymsArray(meaningIndex: number): FormArray {
    const meaning = this.meaningsArray.at(meaningIndex);
    return meaning.get('antonyms') as FormArray;
  }

  getContextArray(translationIndex: number): FormArray {
    const translation = this.translationsArray.at(translationIndex);
    return translation.get('context') as FormArray;
  }

  // Méthodes utilitaires pour gérer les types
  getCategoryName(categoryId: any): string {
    if (typeof categoryId === 'object' && categoryId?.name) {
      return categoryId.name;
    }
    return categoryId || '';
  }

  getCreatedByName(createdBy: any): string {
    if (typeof createdBy === 'object' && createdBy?.username) {
      return createdBy.username;
    }
    return createdBy || '';
  }

  addMeaning(): void {
    this.meaningsArray.push(this.createMeaningFormGroup());
  }

  removeMeaning(index: number): void {
    this.meaningsArray.removeAt(index);
  }

  addDefinition(meaningIndex: number): void {
    const meaning = this.meaningsArray.at(meaningIndex);
    const definitions = meaning.get('definitions') as FormArray;
    definitions.push(this.createDefinitionFormGroup());
  }

  removeDefinition(meaningIndex: number, definitionIndex: number): void {
    const meaning = this.meaningsArray.at(meaningIndex);
    const definitions = meaning.get('definitions') as FormArray;
    definitions.removeAt(definitionIndex);
  }

  addTranslation(): void {
    this.translationsArray.push(this.createTranslationFormGroup());
  }

  removeTranslation(index: number): void {
    this.translationsArray.removeAt(index);
  }

  addArrayItem(formArray: FormArray, value: string = ''): void {
    formArray.push(this._fb.control(value));
  }

  onAudioFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.audioFile = fileList[0];
    }
  }

  onUploadAudio(): void {
    if (!this.audioFile || !this.wordId || !this.audioAccent) {
      return;
    }

    this.isUploadingAudio = true;
    this.successMessage = '';
    this.errorMessage = '';

    this._dictionaryService
      .uploadAudio(this.wordId, this.audioAccent, this.audioFile)
      .subscribe({
        next: (updatedWord) => {
          this.isUploadingAudio = false;
          if (updatedWord) {
            this.word = updatedWord;
            this.successMessage = 'Fichier audio téléversé avec succès !';
            this.audioFile = null;
          }
        },
        error: (err) => {
          this.isUploadingAudio = false;
          this.errorMessage = 'Erreur lors du téléversement du fichier audio.';
          console.error(err);
        },
      });
  }

  removeArrayItem(formArray: FormArray, index: number): void {
    formArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.editWordForm.valid && this.canEdit) {
      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';

      // Nettoyer les données des traductions en supprimant les propriétés frontend
      const cleanTranslations = this.editWordForm.value.translations
        .filter((translation: any) => translation.language && translation.translatedWord)
        .map((translation: any) => {
          const { searchTerm, selectedWordId, targetWordId, ...cleanTranslation } = translation;
          
          // Convertir context string en tableau si nécessaire
          if (cleanTranslation.context && typeof cleanTranslation.context === 'string') {
            const contextStr = cleanTranslation.context.trim();
            if (contextStr) {
              cleanTranslation.context = contextStr
                .split(',')
                .map((item: string) => item.trim())
                .filter((item: string) => item !== '');
            } else {
              delete cleanTranslation.context;
            }
          } else if (!cleanTranslation.context || (Array.isArray(cleanTranslation.context) && cleanTranslation.context.length === 0)) {
            delete cleanTranslation.context;
          }
          
          return cleanTranslation;
        });

      const updateData: UpdateWordDto = {
        pronunciation: this.editWordForm.value.pronunciation,
        etymology: this.editWordForm.value.etymology,
        meanings: this.editWordForm.value.meanings,
        translations: cleanTranslations,
        revisionNotes: this.editWordForm.value.revisionNotes,
        forceRevision: this.editWordForm.value.forceRevision,
      };

      // Vérifier si un fichier audio est présent pour modification
      if (this.audioFile) {
        console.log('🎵 Mise à jour avec audio détectée');

        // Utiliser la méthode unifiée pour modification avec audio
        this._dictionaryService
          .updateWordWithAudio(this.wordId, updateData, this.audioFile)
          .subscribe({
            next: (updatedWord: Word | null) => {
              if (updatedWord) {
                this.successMessage = 'Mot et audio modifiés avec succès !';
                this.isSaving = false;
                this.audioFile = null; // Réinitialiser le fichier audio

                // Rediriger vers les détails du mot après un délai
                setTimeout(() => {
                  this._router.navigate(['/dictionary/word', this.wordId]);
                }, 2000);
              }
            },
            error: (error: any) => {
              this.errorMessage =
                error.error?.message ||
                'Erreur lors de la modification du mot avec audio';
              this.isSaving = false;
              console.error('Error updating word with audio:', error);
            },
          });
      } else {
        console.log('📝 Mise à jour textuelle uniquement');

        // Utiliser la méthode standard pour modification textuelle seulement
        this._dictionaryService.updateWord(this.wordId, updateData).subscribe({
          next: (updatedWord: Word | null) => {
            if (updatedWord) {
              this.successMessage = 'Mot modifié avec succès !';
              this.isSaving = false;

              // Rediriger vers les détails du mot après un délai
              setTimeout(() => {
                this._router.navigate(['/dictionary/word', this.wordId]);
              }, 2000);
            }
          },
          error: (error: any) => {
            this.errorMessage =
              error.error?.message || 'Erreur lors de la modification du mot';
            this.isSaving = false;
            console.error('Error updating word:', error);
          },
        });
      }
    }
  }

  onCancel(): void {
    this._router.navigate(['/dictionary/word', this.wordId]);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending_revision':
        return 'bg-blue-100 text-blue-800';
      case 'revision_approved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      case 'pending_revision':
        return 'En révision';
      case 'revision_approved':
        return 'Révision approuvée';
      default:
        return status;
    }
  }

  // Retourne le nombre de fichiers audio
  audioFilesCount(audioFiles: any): number {
    return audioFiles?.length || 0;
  }

  // === NOUVELLES MÉTHODES POUR LE SYSTÈME DE TRADUCTION INTELLIGENTE ===

  /**
   * Charge les langues disponibles depuis le système de traduction
   */
  private loadAvailableLanguages(): void {
    // Utiliser l'API du dictionnaire pour récupérer les langues disponibles dans la base de données
    // Cette API retourne les langues qui ont effectivement des mots dans la base
    this._http
      .get<
        {
          code: string;
          name: string;
          nativeName: string;
          wordCount: number;
        }[]
      >(`${environment.apiUrl}/words/languages`)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (languages) => {
          this.availableLanguages = languages.map((lang) => ({
            code: lang.code,
            name: lang.name,
            flag: this.getLanguageFlag(lang.code),
            translationCount: lang.wordCount, // Optionnel : pour afficher le nombre de mots
          }));
          console.log(
            '🌍 Langues disponibles chargées:',
            this.availableLanguages
          );
        },
        error: (error) => {
          console.error('Erreur lors du chargement des langues:', error);
          // Fallback avec langues par défaut
          this.availableLanguages =
            this._translationService.getLanguageOptions();
        },
      });
  }

  /**
   * Retourne le drapeau d'une langue
   */
  private getLanguageFlag(code: string): string {
    const flags: { [key: string]: string } = {
      fr: '🇫🇷',
      en: '🇺🇸',
      es: '🇪🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺',
      ja: '🇯🇵',
      zh: '🇨🇳',
    };
    return flags[code] || '🌐';
  }

  /**
   * Recherche intelligente de mots dans une langue spécifique
   */
  searchWordsInLanguage(
    translationIndex: number,
    language: string,
    searchTerm: string
  ): void {
    this.isSearchingWords[translationIndex] = true;
    this.clearSearchResults(translationIndex);

    this._dictionaryService
      .searchWords({
        query: searchTerm,
        languages: [language],
        limit: 10,
        page: 1,
      })
      .pipe(
        takeUntil(this._destroy$),
        catchError(() => of({ words: [], total: 0, page: 1, totalPages: 0 }))
      )
      .subscribe({
        next: (results) => {
          // Extraire les mots du résultat de recherche
          const words = results.words || [];
          this.translationSearchResults[translationIndex] = words;
          this.isSearchingWords[translationIndex] = false;

          // Si aucun résultat, proposer la création d'un nouveau mot
          if (words.length === 0) {
            this.showCreateWordOptions[translationIndex] = true;
          } else {
            this.showCreateWordOptions[translationIndex] = false;
          }
        },
        error: () => {
          this.isSearchingWords[translationIndex] = false;
          this.showCreateWordOptions[translationIndex] = true;
        },
      });
  }

  /**
   * Sélectionne un mot existant pour la traduction
   */
  selectExistingWord(translationIndex: number, word: Word): void {
    const translation = this.translationsArray.at(translationIndex);
    if (translation) {
      this.selectedTranslationWords[translationIndex] = word;
      translation.patchValue({
        translatedWord: word.word,
        selectedWordId: word.id || (word as any)._id,
        searchTerm: word.word,
      });
      this.clearSearchResults(translationIndex);
      this.showCreateWordOptions[translationIndex] = false;
    }
  }

  /**
   * Propose de créer un nouveau mot dans la langue sélectionnée
   */
  proposeCreateNewWord(translationIndex: number): void {
    const translation = this.translationsArray.at(translationIndex);
    const language = translation.get('language')?.value;
    const searchTerm = translation.get('searchTerm')?.value;

    if (language && searchTerm) {
      const confirmCreate = confirm(
        `Le mot "${searchTerm}" n'existe pas en ${this.getLanguageName(
          language
        )}. ` +
          'Voulez-vous être redirigé vers le formulaire de création de mot ?'
      );

      if (confirmCreate) {
        // Naviguer vers le formulaire d'ajout avec les données pré-remplies
        this._router.navigate(['/dictionary/add'], {
          queryParams: {
            word: searchTerm,
            language: language,
            returnTo: `/dictionary/edit/${this.wordId}`,
          },
        });
      }
    }
  }

  /**
   * Efface les résultats de recherche pour un index donné
   */
  clearSearchResults(translationIndex: number): void {
    this.translationSearchResults[translationIndex] = [];
    this.showCreateWordOptions[translationIndex] = false;
  }

  /**
   * Gère le changement de langue pour une traduction
   */
  onTranslationLanguageChange(translationIndex: number): void {
    const translation = this.translationsArray.at(translationIndex);
    const searchTerm = translation.get('searchTerm')?.value;
    const newLanguage = translation.get('language')?.value;

    // Reset les données liées à la langue précédente
    this.clearSearchResults(translationIndex);
    this.selectedTranslationWords[translationIndex] = null;
    translation.patchValue({
      translatedWord: '',
      selectedWordId: null,
      searchTerm: '',
    });

    // Si un terme de recherche existe déjà, relancer la recherche
    if (searchTerm && searchTerm.length >= 2 && newLanguage) {
      this.searchWordsInLanguage(translationIndex, newLanguage, searchTerm);
    }
  }

  /**
   * Retourne le nom d'une langue à partir de son code
   */
  getLanguageName(code: string): string {
    const language = this.availableLanguages.find((l) => l.code === code);
    return language?.name || code.toUpperCase();
  }

  /**
   * Retourne les langues disponibles en excluant la langue source du mot
   */
  getAvailableTargetLanguages(): LanguageOption[] {
    const sourceLanguage = this.word?.language;
    return this.availableLanguages.filter(
      (lang) => lang.code !== sourceLanguage
    );
  }

  /**
   * Vérifie si une traduction a un mot sélectionné
   */
  hasSelectedWord(translationIndex: number): boolean {
    return !!this.selectedTranslationWords[translationIndex];
  }

  /**
   * Retourne le mot sélectionné pour une traduction
   */
  getSelectedWord(translationIndex: number): Word | null {
    return this.selectedTranslationWords[translationIndex] || null;
  }

  /**
   * Supprime la sélection d'un mot pour une traduction
   */
  clearSelectedWord(translationIndex: number): void {
    this.selectedTranslationWords[translationIndex] = null;
    const translation = this.translationsArray.at(translationIndex);
    translation.patchValue({
      translatedWord: '',
      selectedWordId: null,
      searchTerm: '',
    });
  }

  /**
   * Vérifie si une langue est disponible pour la traduction
   */
  isLanguageAvailable(languageCode: string): boolean {
    return this.availableLanguages.some((lang) => lang.code === languageCode);
  }

  /**
   * Formate l'affichage d'un résultat de recherche
   */
  formatSearchResult(word: Word): string {
    const categoryName =
      word.categoryId &&
      typeof word.categoryId === 'object' &&
      (word.categoryId as any).name
        ? ` (${(word.categoryId as any).name})`
        : '';
    const meaningPreview =
      word.meanings &&
      word.meanings.length > 0 &&
      word.meanings[0].definitions &&
      word.meanings[0].definitions.length > 0 &&
      word.meanings[0].definitions[0].definition
        ? ` - ${word.meanings[0].definitions[0].definition.substring(0, 50)}...`
        : '';
    return `${word.word}${categoryName}${meaningPreview}`;
  }

  // === MÉTHODES DE VÉRIFICATION DE SÉCURITÉ POUR LE TEMPLATE ===

  /**
   * Vérifie si un mot a une définition affichable
   */
  hasDefinition(word: Word): boolean {
    return !!word?.meanings?.[0]?.definitions?.[0]?.definition;
  }

  /**
   * Retourne la définition d'un mot de manière sécurisée
   */
  getDefinition(word: Word): string {
    return word?.meanings?.[0]?.definitions?.[0]?.definition || '';
  }

  /**
   * Vérifie si un mot a une catégorie affichable
   */
  hasCategory(word: Word): boolean {
    return !!(
      word?.categoryId &&
      typeof word.categoryId === 'object' &&
      (word.categoryId as any).name
    );
  }

  /**
   * Retourne le nom de la catégorie d'un mot de manière sécurisée
   */
  getCategoryDisplayName(word: Word): string {
    if (word?.categoryId && typeof word.categoryId === 'object') {
      return (word.categoryId as any).name || '';
    }
    return '';
  }

  /**
   * Vérifie si le mot sélectionné a une définition
   */
  selectedWordHasDefinition(translationIndex: number): boolean {
    const selectedWord = this.getSelectedWord(translationIndex);
    return this.hasDefinition(selectedWord!);
  }

  /**
   * Retourne la définition du mot sélectionné
   */
  getSelectedWordDefinition(translationIndex: number): string {
    const selectedWord = this.getSelectedWord(translationIndex);
    return this.getDefinition(selectedWord!);
  }
}
