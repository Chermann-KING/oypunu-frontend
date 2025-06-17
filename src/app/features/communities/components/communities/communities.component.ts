import { Component, OnInit } from '@angular/core';
import {
  CommunitiesService,
  CommunityFilters,
} from '../../../../core/services/communities.service';

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

  constructor(private _communitiesService: CommunitiesService) {
    // S'abonner aux communautés de l'utilisateur
    this._communitiesService.userCommunities$.subscribe((communities) => {
      this.userCommunities = communities.map((c) => c._id);
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

    this._communitiesService.getAll(this.filters).subscribe({
      next: (response) => {
        this.communities = response.communities;
        this.isLoading = false;
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
}
