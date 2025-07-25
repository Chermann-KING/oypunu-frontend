import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserStats } from '../../../../core/models/user';

@Component({
  selector: 'app-profile-view',
  standalone: false,
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.scss'],
})
export class ProfileViewComponent implements OnInit, OnDestroy {
  user: User | null = null;
  userStats: UserStats | null = null;
  isOwnProfile = false;
  isLoading = true;
  error: string | null = null;

  private subscriptions = new Subscription();

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const username = params['username'];
      if (username) {
        this.loadUserProfile(username);
      } else {
        this.loadOwnProfile();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadOwnProfile(): void {
    this.isOwnProfile = true;
    this.isLoading = true;

    const profileSub = this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        // Statistiques temporaires en attendant la correction du backend
        this.userStats = {
          totalWordsAdded: (profile as any).totalWordsAdded || 0,
          totalCommunityPosts: (profile as any).totalCommunityPosts || 0,
          favoriteWordsCount: (profile as any).favoriteWords?.length || 0,
          joinDate: (profile as any).createdAt || new Date()
        };
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement du profil';
        this.isLoading = false;
        console.error('Error loading profile:', error);
      },
    });

    this.subscriptions.add(profileSub);
  }

  private loadUserProfile(username: string): void {
    this.isOwnProfile = false;
    this.isLoading = true;

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.username === username) {
      this.loadOwnProfile();
      return;
    }

    const profileSub = this.profileService
      .getUserByUsername(username)
      .subscribe({
        next: (user) => {
          this.user = user;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Utilisateur non trouvé';
          this.isLoading = false;
          console.error('Error loading user profile:', error);
        },
      });

    this.subscriptions.add(profileSub);
  }

  editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  getJoinDate(): string {
    if (!this.userStats?.joinDate) return '';
    return new Date(this.userStats.joinDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
    });
  }

  getLanguageDisplayName(code: string): string {
    const languages: { [key: string]: string } = {
      fr: 'Français',
      en: 'Anglais',
      es: 'Espagnol',
      de: 'Allemand',
      it: 'Italien',
      pt: 'Portugais',
    };
    return languages[code] || code;
  }

  getInitials(): string {
    if (!this.user?.username) return '';
    return this.user.username.charAt(0).toUpperCase();
  }

  get canProposeLanguages(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return !!(currentUser && currentUser.role && ['contributor', 'admin', 'superadmin'].includes(currentUser.role));
  }
}
