import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterResponse } from '../../../../core/models/auth-response';

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

  constructor(
    private _fb: FormBuilder,
    private _router: Router,
    private _authService: AuthService
  ) {
    this.registerForm = this._fb.group(
      {
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        nativeLanguage: [''],
        terms: [false, Validators.requiredTrue],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {}

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

    const { username, email, password, nativeLanguage } =
      this.registerForm.value;

    this._authService
      .register(username, email, password, nativeLanguage)
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
}
