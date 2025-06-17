import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-social-auth',
  standalone: false,
  templateUrl: './social-auth.component.html',
  styleUrl: './social-auth.component.scss',
})
export class SocialAuthComponent implements OnInit {
  isProcessing = true;
  errorMessage = '';
  // Déclaration de window comme propriété
  window: Window = window;

  constructor(private _route: ActivatedRoute, private _router: Router) {}

  ngOnInit(): void {
    // Récupérer le token depuis les paramètres d'URL
    this._route.queryParams.subscribe((params) => {
      const token = params['token'];

      if (token) {
        try {
          // Stocker le token pour que la fenêtre parente puisse le récupérer
          localStorage.setItem('social_auth_token', token);

          // Fermer la fenêtre actuelle
          setTimeout(() => {
            window.close();
          }, 3000);
        } catch (error) {
          this.isProcessing = false;
          this.errorMessage =
            "Une erreur est survenue lors du traitement de l'authentification.";
          console.error('Auth sociale - Erreur:', error);
        }
      } else {
        this.isProcessing = false;
        this.errorMessage = "Token d'authentification manquant.";
      }
    });
  }

  // Fermer la popup
  closeWindow(): void {
    window.close();
  }
}
