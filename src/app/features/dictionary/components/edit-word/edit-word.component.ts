import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DictionaryService,
  UpdateWordDto,
} from '../../../../core/services/dictionary.service';
import { Word } from '../../../../core/models/word';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-edit-word',
  standalone: false,
  templateUrl: './edit-word.component.html',
  styleUrls: ['./edit-word.component.scss'],
})
export class EditWordComponent implements OnInit {
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

  constructor(
    private _fb: FormBuilder,
    private _dictionaryService: DictionaryService,
    private _authService: AuthService,
    private _route: ActivatedRoute,
    private _router: Router
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
    if (this.wordId) {
      this.loadWord();
    }
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
    return this._fb.group({
      language: [translation?.language || '', Validators.required],
      translatedWord: [translation?.translatedWord || '', Validators.required],
      context: this._fb.array(translation?.context || []),
      confidence: [translation?.confidence || 0],
      verifiedBy: this._fb.array(translation?.verifiedBy || []),
    });
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

      const updateData: UpdateWordDto = {
        pronunciation: this.editWordForm.value.pronunciation,
        etymology: this.editWordForm.value.etymology,
        meanings: this.editWordForm.value.meanings,
        translations: this.editWordForm.value.translations,
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
    return audioFiles ? Object.keys(audioFiles).length : 0;
  }
}
