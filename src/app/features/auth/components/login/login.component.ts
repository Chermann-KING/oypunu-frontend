import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

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
    private _authService: AuthService,
    private _toastService: ToastService
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
      this._toastService.warning(
        'Formulaire invalide',
        'Veuillez vérifier vos informations de connexion'
      );
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this._authService.login(email, password).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        
        // Message de bienvenue personnalisé
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Connexion réussie !',
          `Bienvenue ${username} ! Vous êtes maintenant connecté.`,
          4000
        );
        
        // Redirection avec un petit délai pour laisser voir le message
        setTimeout(() => {
          this._router.navigate(['/']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleLoginError(error);
      },
    });
  }

  loginWithGoogle(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this._toastService.info(
      'Redirection en cours...',
      'Vous allez être redirigé vers Google pour vous connecter'
    );

    this._authService.loginWithGoogle().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Connexion Google réussie !',
          `Bienvenue ${username} ! Connecté via Google.`,
          4000
        );
        
        setTimeout(() => {
          this._router.navigate(['/']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleSocialLoginError(error, 'Google');
      },
    });
  }

  loginWithFacebook(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this._toastService.info(
      'Redirection en cours...',
      'Vous allez être redirigé vers Facebook pour vous connecter'
    );

    this._authService.loginWithFacebook().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Connexion Facebook réussie !',
          `Bienvenue ${username} ! Connecté via Facebook.`,
          4000
        );
        
        setTimeout(() => {
          this._router.navigate(['/']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleSocialLoginError(error, 'Facebook');
      },
    });
  }

  loginWithTwitter(): void {
    this.isSubmitting = true;
    this.errorMessage = '';

    this._toastService.info(
      'Redirection en cours...',
      'Vous allez être redirigé vers Twitter pour vous connecter'
    );

    this._authService.loginWithTwitter().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        const username = response.user?.username || 'utilisateur';
        this._toastService.success(
          '🎉 Connexion Twitter réussie !',
          `Bienvenue ${username} ! Connecté via Twitter.`,
          4000
        );
        
        setTimeout(() => {
          this._router.navigate(['/']);
        }, 1500);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleSocialLoginError(error, 'Twitter');
      },
    });
  }

  /**
   * Gestion spécifique des erreurs de connexion
   */
  private handleLoginError(error: any): void {
    console.error('Erreur de connexion:', error);
    
    let title = 'Erreur de connexion';
    let message = 'Une erreur inattendue est survenue';
    
    // Gestion spécifique selon le type d'erreur
    if (error.status === 401) {
      title = 'Identifiants incorrects';
      message = 'Vérifiez votre email et mot de passe. Mot de passe oublié ?';
    } else if (error.status === 403) {
      title = 'Compte désactivé';
      message = 'Votre compte a été désactivé. Contactez le support.';
    } else if (error.status === 429) {
      title = 'Trop de tentatives';
      message = 'Trop de tentatives de connexion. Réessayez dans quelques minutes.';
    } else if (error.status === 0) {
      title = 'Problème de connexion';
      message = 'Vérifiez votre connexion internet et réessayez.';
    } else if (error.message?.includes('email')) {
      title = 'Email non vérifié';
      message = 'Vérifiez votre email pour activer votre compte.';
    }
    
    this._toastService.error(title, message, 6000);
  }

  /**
   * Gestion spécifique des erreurs de connexion sociale
   */
  private handleSocialLoginError(error: any, provider: string): void {
    console.error(`Erreur de connexion ${provider}:`, error);
    
    let title = `Erreur de connexion ${provider}`;
    let message = 'Une erreur est survenue lors de la connexion';
    
    if (error.status === 401) {
      title = 'Autorisation refusée';
      message = `L'autorisation ${provider} a été refusée ou annulée.`;
    } else if (error.status === 403) {
      title = 'Compte non autorisé';
      message = `Votre compte ${provider} n'est pas autorisé à se connecter.`;
    } else if (error.status === 0) {
      title = 'Problème de connexion';
      message = 'Vérifiez votre connexion internet et réessayez.';
    } else if (error.message?.includes('popup')) {
      title = 'Popup bloquée';
      message = 'Autorisez les popups pour vous connecter via ' + provider;
    }
    
    this._toastService.error(title, message, 6000);
  }
}
