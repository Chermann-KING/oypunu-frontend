import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DictionaryService } from '../../../../core/services/dictionary.service';
import { LanguagesService } from '../../../../core/services/languages.service';

interface Language {
  _id: string;
  name: string;
  nativeName: string;
}

@Component({
  selector: 'app-add-category',
  standalone: false,
  templateUrl: './add-category.component.html',
  styleUrls: ['./add-category.component.scss']
})
export class AddCategoryComponent implements OnInit, OnDestroy {
  
  categoryForm: FormGroup;
  
  // États de l'interface
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  // Contexte
  selectedLanguageId = '';
  selectedLanguage: Language | null = null;
  availableLanguages: Language[] = [];
  isLoadingLanguages = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dictionaryService: DictionaryService,
    private languagesService: LanguagesService
  ) {
    this.categoryForm = this.createForm();
  }
  
  ngOnInit(): void {
    console.log('🎯 AddCategoryComponent initialisé');
    
    // Récupérer les paramètres depuis l'URL
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['languageId']) {
          this.selectedLanguageId = params['languageId'];
          this.loadLanguageInfo(this.selectedLanguageId);
        }
      });
    
    this.loadAvailableLanguages();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      languageId: ['', Validators.required]
    });
  }
  
  private loadLanguageInfo(languageId: string): void {
    console.log('📋 Chargement des infos de langue:', languageId);
    
    this.languagesService.getLanguageById(languageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (language) => {
          this.selectedLanguage = language;
          this.categoryForm.patchValue({
            languageId: languageId
          });
          console.log('✅ Langue sélectionnée:', language);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement de la langue:', error);
          this.errorMessage = 'Erreur lors du chargement de la langue sélectionnée';
        }
      });
  }
  
  private loadAvailableLanguages(): void {
    console.log('📋 Chargement des langues disponibles');
    this.isLoadingLanguages = true;
    
    this.languagesService.getActiveLanguages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (languages) => {
          this.availableLanguages = languages;
          this.isLoadingLanguages = false;
          console.log('✅ Langues chargées:', languages.length);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des langues:', error);
          this.isLoadingLanguages = false;
        }
      });
  }
  
  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    const formData = this.prepareSubmitData();
    
    console.log('📤 Données à soumettre:', formData);
    
    this.dictionaryService.proposeCategory(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Catégorie proposée avec succès:', response);
          this.isSubmitting = false;
          this.successMessage = 'Votre proposition de catégorie a été soumise avec succès ! Elle sera examinée par nos modérateurs.';
          
          // Vider le formulaire
          this.resetForm();
          
          // Faire défiler vers le haut pour voir le message de succès
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          // Redirection après 4 secondes (plus de temps pour voir le message)
          setTimeout(() => {
            this.handleSuccessRedirection();
          }, 4000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la proposition:', error);
          this.isSubmitting = false;
          
          if (error.error?.message) {
            if (Array.isArray(error.error.message)) {
              this.errorMessage = error.error.message.join(', ');
            } else {
              this.errorMessage = error.error.message;
            }
          } else {
            this.errorMessage = 'Une erreur est survenue lors de la soumission. Veuillez réessayer.';
          }
          
          // Effacer le message de succès et faire défiler vers le haut pour voir l'erreur
          this.successMessage = '';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }
  
  private prepareSubmitData(): any {
    const formValue = this.categoryForm.value;
    
    return {
      name: formValue.name.trim(),
      description: formValue.description?.trim() || undefined,
      languageId: formValue.languageId
    };
  }
  
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
  
  // Méthode pour changer la langue sélectionnée
  onLanguageChange(languageId: string): void {
    this.selectedLanguageId = languageId;
    this.selectedLanguage = this.availableLanguages.find(lang => lang._id === languageId) || null;
  }
  
  // Méthode utilitaire pour l'affichage
  getSelectedLanguageDisplay(): string {
    if (this.selectedLanguage) {
      return `${this.selectedLanguage.name} (${this.selectedLanguage.nativeName})`;
    }
    return 'Sélectionnez une langue';
  }

  // Méthode pour vider le formulaire après succès
  private resetForm(): void {
    // Réinitialiser seulement les champs modifiables, garder le contexte de langue
    this.categoryForm.patchValue({
      name: '',
      description: ''
    });
    
    // Marquer le formulaire comme non touché
    this.categoryForm.markAsUntouched();
    this.categoryForm.markAsPristine();
    
    // Effacer les messages d'erreur précédents
    this.errorMessage = '';
  }

  // Gestion de la redirection après succès
  private handleSuccessRedirection(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const returnTo = params['returnTo'];
        
        if (returnTo === 'add-word' && this.selectedLanguageId) {
          // Retour vers add-word avec contexte de langue et notification
          console.log('🔄 Retour vers add-word avec contexte langue');
          this.router.navigate(['/dictionary/add'], {
            queryParams: { 
              languageId: this.selectedLanguageId,
              categoryProposed: 'true',
              message: 'Catégorie proposée avec succès ! Elle sera disponible après approbation.'
            }
          });
        } else if (this.selectedLanguageId) {
          // Redirection standard vers dictionary avec langue
          console.log('🔄 Redirection vers dictionary avec langue');
          this.router.navigate(['/dictionary/add'], {
            queryParams: { 
              languageId: this.selectedLanguageId,
              message: 'category-proposed'
            }
          });
        } else {
          // Redirection par défaut
          console.log('🔄 Redirection par défaut vers dictionary');
          this.router.navigate(['/dictionary']);
        }
      });
  }
}