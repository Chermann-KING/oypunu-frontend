import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LanguagesService } from '../../../../core/services/languages.service';
import { AuthService } from '../../../../core/services/auth.service';

interface CreateLanguageDto {
  name: string;
  nativeName: string;
  iso639_1?: string;
  iso639_2?: string;
  iso639_3?: string;
  region: string;
  countries: string[];
  alternativeNames?: string[];
  status?: 'major' | 'regional' | 'local' | 'liturgical' | 'extinct';
  speakerCount?: number;
  endangermentStatus?: 'endangered' | 'vulnerable' | 'safe' | 'unknown';
  description?: string;
  wikipediaUrl?: string;
  ethnologueUrl?: string;
}

@Component({
  selector: 'app-add-language',
  standalone: false,
  templateUrl: './add-language.component.html',
  styleUrls: ['./add-language.component.scss'],
})
export class AddLanguageComponent implements OnInit {
  currentStep = 1;
  totalSteps = 3;
  languageForm: FormGroup;
  isSubmitting = false;
  hasPermission = false;

  // Options pour les dropdowns
  regions = [
    // Afrique
    'Afrique Centrale',
    "Afrique de l'Ouest",
    "Afrique de l'Est",
    'Afrique du Nord',
    'Afrique Australe',
    'Océan Indien',
    
    // Autres continents
    'Europe',
    'Europe de l\'Est',
    'Europe du Nord',
    'Europe de l\'Ouest',
    'Europe du Sud',
    'Asie',
    'Asie de l\'Est',
    'Asie du Sud-Est',
    'Asie du Sud',
    'Asie Centrale',
    'Asie de l\'Ouest (Moyen-Orient)',
    'Amériques',
    'Amérique du Nord',
    'Amérique Centrale',
    'Amérique du Sud',
    'Caraïbes',
    'Océanie',
    'Pacifique',
    'Mondial', // Pour les langues internationales
  ];

  countries = [
    // Afrique
    { code: 'DZ', name: 'Algérie' },
    { code: 'AO', name: 'Angola' },
    { code: 'BJ', name: 'Bénin' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' },
    { code: 'CM', name: 'Cameroun' },
    { code: 'CV', name: 'Cap-Vert' },
    { code: 'CF', name: 'République Centrafricaine' },
    { code: 'TD', name: 'Tchad' },
    { code: 'KM', name: 'Comores' },
    { code: 'CG', name: 'Congo' },
    { code: 'CD', name: 'République Démocratique du Congo' },
    { code: 'CI', name: "Côte d'Ivoire" },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'EG', name: 'Égypte' },
    { code: 'GQ', name: 'Guinée équatoriale' },
    { code: 'ER', name: 'Érythrée' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'ET', name: 'Éthiopie' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GM', name: 'Gambie' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GN', name: 'Guinée' },
    { code: 'GW', name: 'Guinée-Bissau' },
    { code: 'KE', name: 'Kenya' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LR', name: 'Libéria' },
    { code: 'LY', name: 'Libye' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MW', name: 'Malawi' },
    { code: 'ML', name: 'Mali' },
    { code: 'MR', name: 'Mauritanie' },
    { code: 'MU', name: 'Maurice' },
    { code: 'MA', name: 'Maroc' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'NA', name: 'Namibie' },
    { code: 'NE', name: 'Niger' },
    { code: 'NG', name: 'Nigéria' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'ST', name: 'Sao Tomé-et-Principe' },
    { code: 'SN', name: 'Sénégal' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SO', name: 'Somalie' },
    { code: 'ZA', name: 'Afrique du Sud' },
    { code: 'SS', name: 'Soudan du Sud' },
    { code: 'SD', name: 'Soudan' },
    { code: 'TZ', name: 'Tanzanie' },
    { code: 'TG', name: 'Togo' },
    { code: 'TN', name: 'Tunisie' },
    { code: 'UG', name: 'Ouganda' },
    { code: 'ZM', name: 'Zambie' },
    { code: 'ZW', name: 'Zimbabwe' },

    // Europe
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Espagne' },
    { code: 'DE', name: 'Allemagne' },
    { code: 'IT', name: 'Italie' },
    { code: 'GB', name: 'Royaume-Uni' },
    { code: 'PT', name: 'Portugal' },
    { code: 'NL', name: 'Pays-Bas' },
    { code: 'BE', name: 'Belgique' },
    { code: 'CH', name: 'Suisse' },
    { code: 'AT', name: 'Autriche' },
    { code: 'PL', name: 'Pologne' },
    { code: 'RU', name: 'Russie' },
    { code: 'GR', name: 'Grèce' },
    { code: 'SE', name: 'Suède' },
    { code: 'NO', name: 'Norvège' },
    { code: 'DK', name: 'Danemark' },
    { code: 'FI', name: 'Finlande' },
    { code: 'CZ', name: 'République Tchèque' },
    { code: 'HU', name: 'Hongrie' },
    { code: 'RO', name: 'Roumanie' },

    // Amériques
    { code: 'US', name: 'États-Unis' },
    { code: 'CA', name: 'Canada' },
    { code: 'MX', name: 'Mexique' },
    { code: 'BR', name: 'Brésil' },
    { code: 'AR', name: 'Argentine' },
    { code: 'CL', name: 'Chili' },
    { code: 'CO', name: 'Colombie' },
    { code: 'PE', name: 'Pérou' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'EC', name: 'Équateur' },
    { code: 'BO', name: 'Bolivie' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'UY', name: 'Uruguay' },

    // Asie
    { code: 'CN', name: 'Chine' },
    { code: 'JP', name: 'Japon' },
    { code: 'IN', name: 'Inde' },
    { code: 'KR', name: 'Corée du Sud' },
    { code: 'TH', name: 'Thaïlande' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'ID', name: 'Indonésie' },
    { code: 'MY', name: 'Malaisie' },
    { code: 'SG', name: 'Singapour' },
    { code: 'PH', name: 'Philippines' },
    { code: 'TR', name: 'Turquie' },
    { code: 'IR', name: 'Iran' },
    { code: 'SA', name: 'Arabie Saoudite' },
    { code: 'AE', name: 'Émirats Arabes Unis' },
    { code: 'IL', name: 'Israël' },

    // Océanie
    { code: 'AU', name: 'Australie' },
    { code: 'NZ', name: 'Nouvelle-Zélande' },
    { code: 'FJ', name: 'Fidji' },
    { code: 'PG', name: 'Papouasie-Nouvelle-Guinée' },
  ];

  statusOptions = [
    {
      value: 'major',
      label: 'Majeure',
      description: 'Plus de 1M de locuteurs',
    },
    {
      value: 'regional',
      label: 'Régionale',
      description: '100K - 1M de locuteurs',
    },
    { value: 'local', label: 'Locale', description: 'Moins de 100K locuteurs' },
    {
      value: 'liturgical',
      label: 'Liturgique',
      description: 'Usage religieux/traditionnel',
    },
    {
      value: 'extinct',
      label: 'Éteinte',
      description: 'Plus de locuteurs natifs',
    },
  ];

  endangermentOptions = [
    {
      value: 'safe',
      label: 'Sûre',
      icon: '✅',
      description: 'Transmission assurée',
    },
    {
      value: 'vulnerable',
      label: 'Vulnérable',
      icon: '⚠️',
      description: 'Transmission en déclin',
    },
    {
      value: 'endangered',
      label: 'En danger',
      icon: '🚨',
      description: "Peu d'enfants l'apprennent",
    },
    {
      value: 'unknown',
      label: 'Inconnu',
      icon: '❓',
      description: 'Données insuffisantes',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private languagesService: LanguagesService,
    private authService: AuthService
  ) {
    this.languageForm = this.createForm();
  }

  ngOnInit(): void {
    this.checkPermissions();
  }

  checkPermissions(): void {
    const user = this.authService.getCurrentUser();
    this.hasPermission = !!(
      user && user.role && ['contributor', 'admin', 'superadmin'].includes(user.role)
    );

    if (!this.hasPermission) {
      this.router.navigate(['/']);
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Étape 1: Informations essentielles
      name: ['', [Validators.required, Validators.minLength(2)]],
      nativeName: ['', [Validators.required, Validators.minLength(2)]],
      region: ['', Validators.required],
      countries: [[], Validators.required],

      // Étape 2: Détails linguistiques
      iso639_1: ['', [Validators.pattern(/^[a-z]{2}$/)]],
      iso639_2: ['', [Validators.pattern(/^[a-z]{3}$/)]],
      iso639_3: ['', [Validators.pattern(/^[a-z]{3}$/)]],
      speakerCount: [null, [Validators.min(0)]],
      status: ['local'],
      endangermentStatus: ['unknown'],

      // Étape 3: Compléments
      description: [''],
      alternativeNames: this.fb.array([]),
      wikipediaUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      ethnologueUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    });
  }

  get alternativeNamesArray(): FormArray {
    return this.languageForm.get('alternativeNames') as FormArray;
  }

  addAlternativeName(): void {
    this.alternativeNamesArray.push(this.fb.control('', Validators.required));
  }

  removeAlternativeName(index: number): void {
    this.alternativeNamesArray.removeAt(index);
  }

  nextStep(): void {
    if (this.isStepValid(this.currentStep)) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!(
          this.languageForm.get('name')?.valid &&
          this.languageForm.get('nativeName')?.valid &&
          this.languageForm.get('region')?.valid &&
          this.languageForm.get('countries')?.valid
        );
      case 2:
        // Tous les champs de l'étape 2 sont optionnels ou ont des validateurs non-bloquants
        return true;
      case 3:
        // Validation des URLs si présentes
        const wikiValid =
          !this.languageForm.get('wikipediaUrl')?.value ||
          !!this.languageForm.get('wikipediaUrl')?.valid;
        const ethnoValid =
          !this.languageForm.get('ethnologueUrl')?.value ||
          !!this.languageForm.get('ethnologueUrl')?.valid;
        return !!(wikiValid && ethnoValid);
      default:
        return false;
    }
  }

  onSubmit(): void {
    if (!this.languageForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.prepareFormData();

    console.log('🚀 Soumission de la langue:', formData);
    console.log('👤 Utilisateur actuel:', this.authService.getCurrentUser());

    this.languagesService.proposeLanguage(formData).subscribe({
      next: (response) => {
        console.log('✅ Langue proposée avec succès:', response);
        console.log('📊 Statut de la langue:', response.systemStatus);
        
        // Réinitialiser le formulaire AVANT la redirection
        this.isSubmitting = false;
        this.languageForm.reset();
        this.currentStep = 1;
        
        // Petit délai pour permettre à l'UI de se mettre à jour
        setTimeout(() => {
          // Rediriger vers le dashboard admin avec un message de succès
          this.router.navigate(['/admin'], {
            queryParams: { success: 'language-proposed' },
          });
        }, 100);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la proposition:', error);
        console.error('📋 Détails de l\'erreur:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message || error.message,
          url: error.url
        });
        
        this.isSubmitting = false;
        
        // Afficher un message d'erreur détaillé
        const errorMessage = error.error?.message || error.message || 'Erreur inconnue';
        alert(`Erreur lors de la proposition de la langue: ${errorMessage}`);
      },
    });
  }

  private prepareFormData(): CreateLanguageDto {
    const formValue = this.languageForm.value;

    // Nettoyer les données
    const data: CreateLanguageDto = {
      name: formValue.name.trim(),
      nativeName: formValue.nativeName.trim(),
      region: formValue.region,
      countries: formValue.countries,
    };

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (formValue.iso639_1?.trim())
      data.iso639_1 = formValue.iso639_1.trim().toLowerCase();
    if (formValue.iso639_2?.trim())
      data.iso639_2 = formValue.iso639_2.trim().toLowerCase();
    if (formValue.iso639_3?.trim())
      data.iso639_3 = formValue.iso639_3.trim().toLowerCase();
    if (formValue.speakerCount > 0) data.speakerCount = formValue.speakerCount;
    if (formValue.status !== 'local') data.status = formValue.status;
    if (formValue.endangermentStatus !== 'unknown')
      data.endangermentStatus = formValue.endangermentStatus;
    if (formValue.description?.trim())
      data.description = formValue.description.trim();
    if (formValue.wikipediaUrl?.trim())
      data.wikipediaUrl = formValue.wikipediaUrl.trim();
    if (formValue.ethnologueUrl?.trim())
      data.ethnologueUrl = formValue.ethnologueUrl.trim();

    // Filtrer les noms alternatifs non vides
    const altNames = formValue.alternativeNames?.filter((name: string) =>
      name?.trim()
    );
    if (altNames?.length > 0)
      data.alternativeNames = altNames.map((name: string) => name.trim());

    return data;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.languageForm.controls).forEach((key) => {
      const control = this.languageForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.languageForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength'])
        return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['pattern']) return 'Format invalide';
      if (field.errors['min']) return 'La valeur doit être positive';
    }
    return '';
  }

  formatSpeakerCount(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  }

  onCountryChange(event: Event, countryCode: string): void {
    const target = event.target as HTMLInputElement;
    const currentCountries = this.languageForm.get('countries')?.value || [];

    if (target.checked) {
      // Ajouter le pays s'il n'est pas déjà présent
      if (!currentCountries.includes(countryCode)) {
        this.languageForm.patchValue({
          countries: [...currentCountries, countryCode],
        });
      }
    } else {
      // Retirer le pays
      this.languageForm.patchValue({
        countries: currentCountries.filter(
          (code: string) => code !== countryCode
        ),
      });
    }
  }
}
