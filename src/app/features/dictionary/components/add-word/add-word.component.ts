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
import { Router } from '@angular/router';
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

  // Options pour les langages
  languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'Anglais' },
    { code: 'es', name: 'Espagnol' },
    { code: 'de', name: 'Allemand' },
    { code: 'it', name: 'Italien' },
    { code: 'pt', name: 'Portugais' },
    { code: 'ru', name: 'Russe' },
    { code: 'ja', name: 'Japonais' },
    { code: 'zh', name: 'Chinois' },
  ];

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
    private _router: Router
  ) {
    // Initialisation du formulaire
    this.wordForm = this._fb.group({
      word: ['', [Validators.required, Validators.minLength(1)]],
      language: ['', Validators.required],
      pronunciation: [''],
      etymology: [''],
      categoryId: [''],
      meanings: this._fb.array([this.createMeaning()]),
    });
  }

  ngOnInit(): void {
    // Chargement des catégories au démarrage
    this.wordForm.get('categoryId')?.valueChanges.subscribe((categoryId) => {
      this.informationRecue += categoryId;
    });
    // Ajout d'un écouteur pour le changement de langue
    this.wordForm
      .get('language')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe((selectedLanguage) => {
        if (selectedLanguage) {
          this.informationRecue += selectedLanguage;
          // Charger les catégories pour la langue sélectionnée
          this._loadCategoriesByLanguage(selectedLanguage);
        } else {
          // Si aucune langue n'est sélectionnée, vider la liste des catégories
          this.categories = [];
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

      if (!submitData.language || submitData.language.trim() === '') {
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
      formData.append('language', submitData.language.trim());
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
  private _loadCategoriesByLanguage(language: string): void {
    this._dictionaryService
      .getCategories(language)
      .pipe(takeUntil(this._destroy$))
      .subscribe((categoriesFromApi) => {
        this.categories = categoriesFromApi.map((cat) => ({
          _id: cat._id as string,
          id: cat._id as string,
          name: cat.name,
          description: cat.description,
          language: cat.language,
        }));
        // Vérifier si la catégorie actuelle est toujours valide
        // Si la catégorie actuelle n'est pas dans la liste des catégories chargées,
        // réinitialiser le champ categoryId
        // Cela garantit que l'utilisateur ne peut pas soumettre une catégorie invalide
        // après avoir changé la langue
        // et que le formulaire est toujours valide
        const currentCategoryId = this.wordForm.get('categoryId')?.value;
        console.log('Current category: ' + currentCategoryId);

        if (
          currentCategoryId &&
          !this.categories.some((cat) => cat._id === currentCategoryId)
        ) {
          this.wordForm.get('categoryId')?.setValue('');
        }
      });
  }

  // Méthode pour réinitialiser le formulaire
  private _resetForm(): void {
    // Réinitialiser les contrôles simples
    this.wordForm.patchValue({
      word: '',
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
}
