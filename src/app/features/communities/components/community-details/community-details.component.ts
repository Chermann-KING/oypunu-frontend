import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CommunitiesService,
  CommunityMember,
} from '../../../../core/services/communities.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Community } from '../../../../core/models/community';
import { Subscription, forkJoin } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-community-details',
  standalone: false,
  templateUrl: './community-details.component.html',
  styleUrl: './community-details.component.scss',
})
export class CommunityDetailsComponent implements OnInit, OnDestroy {
  community: Community | null = null;
  members: CommunityMember[] = [];
  userRole: 'admin' | 'moderator' | 'member' | null = null;
  isMember = false;
  isLoading = true;
  loadingAction = false;
  errorMessage: string | null = null;
  currentUser: any = null;
  activeTab: 'discussions' | 'members' | 'about' = 'discussions';

  private subscriptions = new Subscription();

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _communitiesService: CommunitiesService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCommunityData();

    // Souscrire à l'Observable pour obtenir l'utilisateur courant
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setActiveTab(tab: 'discussions' | 'members' | 'about'): void {
    this.activeTab = tab;
  }

  getLanguageName(code: string): string {
    const languageMap: { [key: string]: string } = {
      fr: 'Français',
      en: 'Anglais',
      es: 'Espagnol',
      de: 'Allemand',
      it: 'Italien',
      pt: 'Portugais',
      ja: 'Japonais',
      zh: 'Chinois',
      ru: 'Russe',
    };

    return languageMap[code] || code;
  }

  loadCommunityData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const communityId = this._route.snapshot.paramMap.get('id');
    if (!communityId) {
      this.errorMessage = 'ID de communauté non valide';
      this.isLoading = false;
      return;
    }

    // Charger d'abord la communauté
    this._communitiesService.getOne(communityId).subscribe({
      next: (community) => {
        this.community = community;

        // Ensuite charger les membres séparément pour éviter les dépendances
        this._communitiesService.getMembers(communityId).subscribe({
          next: (membersData) => {
            console.log('Membres chargés:', membersData);
            this.members = membersData.members || [];

            // Vérifier la cohérence avec le compteur
            if (
              this.community &&
              this.members.length !== this.community.memberCount
            ) {
              console.log(
                `Correction du compteur: ${this.community.memberCount} → ${this.members.length}`
              );
              // Mettre à jour le compteur localement pour l'affichage
              this.community.memberCount = this.members.length;
            }

            // Vérifier si l'utilisateur est authentifié pour demander les infos supplémentaires
            if (this.authService.isAuthenticated()) {
              // Requêtes indépendantes pour éviter les échecs en cascade
              this._communitiesService.isMember(communityId).subscribe({
                next: (isMember) => (this.isMember = isMember),
                error: (err) =>
                  console.error(
                    'Erreur lors de la vérification du statut de membre:',
                    err
                  ),
              });

              // Dans community-details.component.ts
              this._communitiesService.getMemberRole(communityId).subscribe({
                next: (role) => {
                  console.log('Rôle récupéré:', role);
                  // Vérifier d'abord si l'utilisateur est membre, puis définir le rôle
                  if (this.isMember && (role === null || role === undefined)) {
                    this.userRole = 'member';
                  } else {
                    this.userRole = role;
                  }
                  console.log('Rôle final défini:', this.userRole);
                },
                error: (err) => {
                  console.error('Erreur lors de la récupération du rôle:', err);
                  // Vérifier si c'est une réponse avec status 200 mais ok: false
                  if (err.status === 200) {
                    // Assumer que l'utilisateur est un membre régulier s'il est déjà vérifié comme membre
                    if (this.isMember) {
                      this.userRole = 'member';
                      console.log('Définition du rôle par défaut à member');
                    }
                  }
                },
                complete: () => {
                  // S'assurer que les deux requêtes sont terminées avant de mettre à jour l'UI
                  this.updateUIState();
                },
              });
            }

            this.updateUIState();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des membres:', error);
            this.members = [];
            this.isLoading = false;
          },
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la communauté:', error);
        this.errorMessage =
          'Erreur lors du chargement des détails de la communauté';
        this.isLoading = false;
      },
    });
  }

  joinCommunity(): void {
    if (!this.community || this.loadingAction) return;

    this.loadingAction = true;
    this._communitiesService.join(this.community._id).subscribe({
      next: () => {
        this.isMember = true;
        this.userRole = 'member';
        // Recharger les membres pour mettre à jour la liste
        this.loadCommunityData();
        this.updateUIState();
        this.loadingAction = false;
      },
      error: (error) => {
        console.error('Error joining community:', error);
        this.errorMessage =
          'Erreur lors de la tentative de rejoindre la communauté';
        this.loadingAction = false;
      },
    });
  }

  leaveCommunity(): void {
    if (!this.community || this.loadingAction) return;

    this.loadingAction = true;
    this._communitiesService.leave(this.community._id).subscribe({
      next: () => {
        this.isMember = false;
        this.userRole = null;
        // Recharger les membres pour mettre à jour la liste
        this.loadCommunityData();
        this.loadingAction = false;
      },
      error: (error) => {
        console.error('Error leaving community:', error);
        this.errorMessage =
          'Erreur lors de la tentative de quitter la communauté';
        this.loadingAction = false;
      },
    });
  }

  updateMemberRole(
    memberId: string,
    newRole: 'admin' | 'moderator' | 'member'
  ): void {
    if (!this.community || this.loadingAction || this.userRole !== 'admin')
      return;

    this.loadingAction = true;
    this._communitiesService
      .updateMemberRole(this.community._id, memberId, newRole)
      .subscribe({
        next: () => {
          // Recharger les membres pour mettre à jour les rôles
          this.loadCommunityData();
          this.loadingAction = false;
        },
        error: (error) => {
          console.error('Error updating member role:', error);
          this.errorMessage = 'Erreur lors de la modification du rôle';
          this.loadingAction = false;
        },
      });
  }

  updateUIState(): void {
    // Mettre à jour le nombre de membres affiché
    if (this.community && this.members.length !== this.community.memberCount) {
      console.log(`Mise à jour du compteur: ${this.members.length} membres`);
      this.community.memberCount = this.members.length;
    }

    // S'assurer que le statut de membre et le rôle sont cohérents
    if (this.isMember && !this.userRole) {
      this.userRole = 'member';
    }

    if (!this.isMember && this.userRole) {
      this.userRole = null;
    }
  }

  // Formatter la date au format local
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  // Vérifier si l'utilisateur est admin
  isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  // Vérifier si l'utilisateur est modérateur ou admin
  isModeratorOrAdmin(): boolean {
    return this.userRole === 'admin' || this.userRole === 'moderator';
  }
}
