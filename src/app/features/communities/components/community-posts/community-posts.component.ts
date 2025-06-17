import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommunityPostsService } from '../../../../core/services/community-posts.service';
import { CommunitiesService } from '../../../../core/services/communities.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Post,
  PostFormData,
  PostFilters,
} from '../../../../core/models/community-posts';

@Component({
  selector: 'app-community-posts',
  standalone: false,
  templateUrl: './community-posts.component.html',
  styleUrls: ['./community-posts.component.scss'],
})
export class CommunityPostsComponent implements OnInit {
  communityId: string = '';
  posts: Post[] = [];
  isLoading = false;
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 0;

  // États d'appartenance à la communauté
  isMember = false;
  isCheckingMembership = false;
  isJoiningCommunity = false;
  membershipError: string | null = null;

  newPostForm: PostFormData = {
    title: '',
    content: '',
    postType: 'discussion',
    languages: [],
    tags: [],
    targetWord: '',
    difficulty: 'beginner',
  };

  filters: PostFilters = {
    sortBy: 'score',
    timeRange: 'all',
  };

  currentUser: any;

  // Options pour les dropdowns
  postTypes = [
    { value: 'question', label: 'Question' },
    { value: 'explanation', label: 'Explication' },
    { value: 'etymology', label: 'Étymologie' },
    { value: 'usage', label: 'Usage' },
    { value: 'translation', label: 'Traduction' },
    { value: 'discussion', label: 'Discussion' },
  ];

  difficulties = [
    { value: 'beginner', label: 'Débutant' },
    { value: 'intermediate', label: 'Intermédiaire' },
    { value: 'advanced', label: 'Avancé' },
  ];

  sortOptions = [
    { value: 'score', label: 'Meilleur score' },
    { value: 'newest', label: 'Plus récent' },
    { value: 'oldest', label: 'Plus ancien' },
    { value: 'activity', label: 'Activité récente' },
    { value: 'controversial', label: 'Controversé' },
  ];

  // Langues disponibles chargées depuis l'API
  availableLanguages: {
    code: string;
    name: string;
    nativeName: string;
    wordCount: number;
  }[] = [];
  isLoadingLanguages = false;

  constructor(
    private route: ActivatedRoute,
    private postsService: CommunityPostsService,
    private communitiesService: CommunitiesService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.communityId = params['id'];
      this.loadPosts();
      this.checkMembership();
    });

    this.currentUser = this.authService.getCurrentUser();
    this.loadAvailableLanguages();
  }

  // Vérifier si l'utilisateur est membre de la communauté
  checkMembership(): void {
    if (!this.authService.isAuthenticated()) {
      this.isMember = false;
      return;
    }

    this.isCheckingMembership = true;
    this.membershipError = null;

    this.communitiesService.isMember(this.communityId).subscribe({
      next: (isMember) => {
        this.isMember = isMember;
        this.isCheckingMembership = false;
        console.log('Statut de membre:', isMember);
      },
      error: (error) => {
        console.error(
          'Erreur lors de la vérification du statut de membre:',
          error
        );
        this.membershipError = 'Impossible de vérifier votre statut de membre';
        this.isCheckingMembership = false;
      },
    });
  }

  // Rejoindre automatiquement la communauté
  joinCommunity(): void {
    if (!this.authService.isAuthenticated() || this.isJoiningCommunity) {
      return;
    }

    this.isJoiningCommunity = true;
    this.membershipError = null;

    this.communitiesService.join(this.communityId).subscribe({
      next: () => {
        this.isMember = true;
        this.isJoiningCommunity = false;
        console.log('Rejoint la communauté avec succès');
      },
      error: (error) => {
        console.error("Erreur lors de l'adhésion à la communauté:", error);
        this.membershipError = 'Impossible de rejoindre la communauté';
        this.isJoiningCommunity = false;
      },
    });
  }

  loadPosts(): void {
    this.isLoading = true;
    this.postsService
      .getPosts(this.communityId, this.page, this.limit, this.filters)
      .subscribe({
        next: (response) => {
          this.posts = response.posts || [];
          this.total = response.total;
          this.totalPages = response.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des posts:', error);
          this.isLoading = false;
        },
      });
  }

  createPost(): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('Vous devez être connecté pour publier');
      return;
    }

    if (!this.isMember) {
      console.warn('Vous devez être membre de la communauté pour publier');
      this.membershipError =
        'Vous devez rejoindre cette communauté pour publier';
      return;
    }

    if (!this.newPostForm.title.trim() || !this.newPostForm.content.trim()) {
      console.warn('Titre et contenu requis');
      return;
    }

    // Nettoyer les données avant envoi
    const postData: PostFormData = {
      title: this.newPostForm.title.trim(),
      content: this.newPostForm.content.trim(),
      postType: this.newPostForm.postType,
      languages: this.newPostForm.languages?.filter((l) => l.trim()) || [],
      tags: this.newPostForm.tags?.filter((t) => t.trim()) || [],
      targetWord: this.newPostForm.targetWord?.trim() || undefined,
      difficulty: this.newPostForm.difficulty || 'beginner',
    };

    this.isLoading = true;
    this.membershipError = null;

    this.postsService.createPost(this.communityId, postData).subscribe({
      next: (post) => {
        console.log('Post créé avec succès:', post);
        this.loadPosts();
        this.resetForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la création du post:', error);

        // Vérifier si l'erreur est liée à l'appartenance à la communauté
        if (error.status === 403 && error.error?.message?.includes('membre')) {
          this.membershipError =
            'Vous devez être membre de cette communauté pour publier';
          this.isMember = false; // Forcer la re-vérification
        } else {
          this.membershipError = 'Erreur lors de la création du post';
        }

        this.isLoading = false;
      },
    });
  }

  resetForm(): void {
    this.newPostForm = {
      title: '',
      content: '',
      postType: 'discussion',
      languages: [],
      tags: [],
      targetWord: '',
      difficulty: 'beginner',
    };
  }

  onFiltersChange(): void {
    this.page = 1; // Reset to first page when filters change
    this.loadPosts();
  }

  onSortChange(sortBy: string): void {
    this.filters.sortBy = sortBy as any;
    this.page = 1;
    this.loadPosts();
  }

  votePost(postId: string, voteType: 'up' | 'down'): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('Vous devez être connecté pour voter');
      return;
    }

    this.postsService.votePost(postId, voteType).subscribe({
      next: (response) => {
        // Mettre à jour le post dans la liste
        const post = this.posts.find((p) => p._id === postId);
        if (post) {
          post.score = response.newScore;
          post.upvotes = response.upvotes;
          post.downvotes = response.downvotes;
          post.userVote = response.userVote;
        }
      },
      error: (error) => {
        console.error('Erreur lors du vote:', error);
      },
    });
  }

  changePage(newPage: number): void {
    this.page = newPage;
    this.loadPosts();
  }

  // Méthodes utilitaires pour les badges
  getPostTypeLabel(postType: string): string {
    const labels: { [key: string]: string } = {
      question: 'Question',
      explanation: 'Explication',
      etymology: 'Étymologie',
      usage: 'Usage',
      translation: 'Traduction',
      discussion: 'Discussion',
    };
    return labels[postType] || postType;
  }

  getPostTypeBadgeClass(postType: string): string {
    const classes: { [key: string]: string } = {
      question: 'bg-purple-600 text-white',
      explanation: 'bg-blue-600 text-white',
      etymology: 'bg-green-600 text-white',
      usage: 'bg-orange-600 text-white',
      translation: 'bg-pink-600 text-white',
      discussion: 'bg-gray-600 text-white',
    };
    return classes[postType] || 'bg-gray-600 text-white';
  }

  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      beginner: 'Débutant',
      intermediate: 'Intermédiaire',
      advanced: 'Avancé',
    };
    return labels[difficulty] || difficulty;
  }

  getDifficultyBadgeClass(difficulty: string): string {
    const classes: { [key: string]: string } = {
      beginner: 'bg-green-700 text-green-200',
      intermediate: 'bg-yellow-700 text-yellow-200',
      advanced: 'bg-red-700 text-red-200',
    };
    return classes[difficulty] || 'bg-gray-700 text-gray-200';
  }

  addTag(event: any): void {
    if (event.key === 'Enter' && event.target.value.trim()) {
      const tag = event.target.value.trim();
      if (!this.newPostForm.tags.includes(tag)) {
        this.newPostForm.tags.push(tag);
      }
      event.target.value = '';
    }
  }

  removeTag(index: number): void {
    this.newPostForm.tags.splice(index, 1);
  }

  addLanguage(event: any): void {
    if (event.key === 'Enter' && event.target.value.trim()) {
      const language = event.target.value.trim();
      if (!this.newPostForm.languages?.includes(language)) {
        this.newPostForm.languages = this.newPostForm.languages || [];
        this.newPostForm.languages.push(language);
      }
      event.target.value = '';
    }
  }

  removeLanguage(index: number): void {
    this.newPostForm.languages?.splice(index, 1);
  }

  // Méthodes pour gérer la sélection de langues avec liste déroulante
  onLanguageSelect(event: any): void {
    const selectedLanguageCode = event.target.value;
    if (
      selectedLanguageCode &&
      !this.newPostForm.languages?.includes(selectedLanguageCode)
    ) {
      this.newPostForm.languages = this.newPostForm.languages || [];
      this.newPostForm.languages.push(selectedLanguageCode);
    }
    // Réinitialiser la sélection
    event.target.value = '';
  }

  removeLanguageByCode(languageCode: string): void {
    if (this.newPostForm.languages) {
      const index = this.newPostForm.languages.indexOf(languageCode);
      if (index > -1) {
        this.newPostForm.languages.splice(index, 1);
      }
    }
  }

  getLanguageName(code: string): string {
    const language = this.availableLanguages.find((lang) => lang.code === code);
    return language ? `${language.name} (${language.nativeName})` : code;
  }

  // Filtrer les langues déjà sélectionnées
  getUnselectedLanguages() {
    return this.availableLanguages.filter(
      (lang) => !this.newPostForm.languages?.includes(lang.code)
    );
  }

  loadAvailableLanguages(): void {
    this.isLoadingLanguages = true;
    this.postsService.getAvailableLanguages().subscribe({
      next: (languages) => {
        this.availableLanguages = languages;
        this.isLoadingLanguages = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des langues:', error);
        this.isLoadingLanguages = false;
        // Fallback vers des langues prédéfinies en cas d'erreur
        this.availableLanguages = [
          {
            code: 'fr',
            name: 'Français',
            nativeName: 'Français',
            wordCount: 0,
          },
          { code: 'en', name: 'Anglais', nativeName: 'English', wordCount: 0 },
          { code: 'es', name: 'Espagnol', nativeName: 'Español', wordCount: 0 },
          { code: 'de', name: 'Allemand', nativeName: 'Deutsch', wordCount: 0 },
          { code: 'it', name: 'Italien', nativeName: 'Italiano', wordCount: 0 },
        ];
      },
    });
  }
}
