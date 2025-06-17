import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  formSubmitted = false;

  constructor(
    private _fb: FormBuilder,
    private _router: Router,
    private _authService: AuthService
  ) {
    this.loginForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [false],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    this.formSubmitted = true;

    if (this.loginForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this._authService.login(email, password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this._router.navigate(['/']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.message || 'Une erreur est survenue lors de la connexion';
      },
    });
  }

  loginWithGoogle(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this._authService.loginWithGoogle().subscribe({
      next: () => {
        this.isSubmitting = false;
        this._router.navigate(['/']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.message ||
          'Une erreur est survenue lors de la connexion avec Google';
      },
    });
  }

  loginWithFacebook(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this._authService.loginWithFacebook().subscribe({
      next: () => {
        this.isSubmitting = false;
        this._router.navigate(['/']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.message ||
          'Une erreur est survenue lors de la connexion avec Facebook';
      },
    });
  }

  loginWithTwitter(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this._authService.loginWithTwitter().subscribe({
      next: () => {
        this.isSubmitting = false;
        this._router.navigate(['/']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage =
          error.message ||
          'Une erreur est survenue lors de la connexion avec Twitter';
      },
    });
  }
}
