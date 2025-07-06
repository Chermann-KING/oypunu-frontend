import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterResponse } from '../../../../core/models/auth-response';
import { Language } from '../../../../core/services/languages.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  contextMessage = '';
  selectedLanguage: Language | null = null;

  constructor(
    private _fb: FormBuilder,
    private _router: Router,
    private _route: ActivatedRoute,
    private _authService: AuthService
  ) {
    this.registerForm = this._fb.group(
      {
        username: ['', [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9_-]+$/),
          Validators.minLength(3),
          Validators.maxLength(30)
        ]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        nativeLanguage: [''],
        hasAcceptedTerms: [false, Validators.requiredTrue],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Vérifier s'il y a un contexte spécifique dans les paramètres de la route
    this._route.queryParams.subscribe(params => {
      if (params['action'] === 'favorite') {
        this.contextMessage = '💙 Créez votre compte pour ajouter des mots à vos favoris et accéder à toutes les fonctionnalités !';
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { username, email, password, nativeLanguage, hasAcceptedTerms } =
      this.registerForm.value;

    // Utiliser l'ID de la langue sélectionnée ou le code si pas de langue sélectionnée
    const languageValue = this.selectedLanguage ? this.selectedLanguage._id : nativeLanguage;

    this._authService
      .register(username, email, password, languageValue, hasAcceptedTerms)
      .subscribe({
        next: (response: RegisterResponse) => {
          this.isSubmitting = false;
          this.successMessage =
            response.message ||
            'Inscription réussie ! Un email de vérification a été envoyé à votre adresse email.';

          // On force un délai de 3 secondes avant toute redirection
          setTimeout(() => {
            if (response.tokens && response.user) {
              // Cas de l'inscription par réseau social ou sans vérification email
              this._router.navigate(['/']);
            } else {
              // Cas de l'inscription classique avec vérification email
              this._router.navigate(['/auth/login']);
            }
          }, 5000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.message || "Une erreur est survenue lors de l'inscription";
        },
      });
  }

  onLanguageSelected(language: Language): void {
    this.selectedLanguage = language;
    // La valeur est automatiquement mise à jour via le ControlValueAccessor
  }
}
