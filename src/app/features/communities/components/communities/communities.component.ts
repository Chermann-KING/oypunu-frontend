import { Component, OnInit } from '@angular/core';
import {
  CommunitiesService,
  CommunityFilters,
} from '../../../../core/services/communities.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GuestLimitsService } from '../../../../core/services/guest-limits.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-communities',
  standalone: false,
  templateUrl: './communities.component.html',
  styleUrl: './communities.component.scss',
})
export class CommunitiesComponent implements OnInit {
  filters: CommunityFilters = {
    language: '', // Initialisation avec une chaîne vide pour "Toutes les langues"
  };
  communities: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  userCommunities: string[] = [];
  isAuthenticated = false;

  // Gestion des limitations pour visiteurs
  showSignupModal = false;
  guestLimits: any = null;

  constructor(
    private _communitiesService: CommunitiesService,
    private _authService: AuthService,
    private _guestLimitsService: GuestLimitsService,
    private _toastService: ToastService,
    private _router: Router
  ) {
    // S'abonner aux communautés de l'utilisateur
    this._communitiesService.userCommunities$.subscribe((communities) => {
      this.userCommunities = communities.map((c) => c._id);
    });

    // Vérifier l'état d'authentification
    this._authService.currentUser$.subscribe((user) => {
      this.isAuthenticated = !!user;
    });
  }

  ngOnInit(): void {
    this.loadCommunities();
  }

  onFilterChange(): void {
    this.loadCommunities();
  }

  loadCommunities(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Vérifier les limitations pour les visiteurs non authentifiés
    if (!this.isAuthenticated) {
      const limitResult = this._guestLimitsService.canViewCommunity();
      if (!limitResult.allowed) {
        this.showSignupModal = true;
        this.guestLimits = this._guestLimitsService.getCurrentLimits();
        this.errorMessage = limitResult.message || 'Limite de consultation atteinte';
        this.isLoading = false;
        return;
      }
    }

    this._communitiesService.getAll(this.filters).subscribe({
      next: (response) => {
        this.communities = response.communities;
        this.isLoading = false;
        
        // Donner du feedback discret sur les consultations restantes pour les visiteurs
        if (!this.isAuthenticated && response.communities.length > 0) {
          const stats = this._guestLimitsService.getCurrentStats();
          if (stats.communitiesRemaining === 1) {
            this._toastService.warning(
              'Dernière visite communauté gratuite',
              'Rejoignez la communauté gratuitement pour participer aux discussions !',
              4000
            );
          } else if (stats.communitiesRemaining === 0) {
            this._toastService.info(
              'Découverte des communautés terminée',
              'Créez votre compte pour rejoindre les communautés et échanger !',
              5000
            );
          }
        }
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des communautés';
        this.isLoading = false;
      },
    });
  }

  isMember(communityId: string): boolean {
    return this.userCommunities.includes(communityId);
  }

  joinCommunity(communityId: string): void {
    this._communitiesService.join(communityId).subscribe({
      next: () => this.loadCommunities(),
      error: () =>
        (this.errorMessage =
          'Erreur lors de la tentative de rejoindre la communauté'),
    });
  }

  /**
   * Fermer la modal d'inscription
   */
  closeSignupModal(): void {
    this.showSignupModal = false;
  }

  /**
   * Naviguer vers la page d'inscription
   */
  goToSignup(): void {
    this._router.navigate(['/auth/register']);
  }

  /**
   * Naviguer vers la page de connexion
   */
  goToLogin(): void {
    this._router.navigate(['/auth/login']);
  }
}
