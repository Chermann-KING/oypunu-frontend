import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommunityPostsService } from '../../../../core/services/community-posts.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Post, Comment } from '../../../../core/models/community-posts';

@Component({
  selector: 'app-post-detail',
  standalone: false,
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss'],
})
export class PostDetailComponent implements OnInit {
  postId: string = '';
  post: Post | null = null;
  comments: Comment[] = [];
  isLoading = false;
  page = 1;
  limit = 20;
  total = 0;
  totalPages = 0;
  newComment = '';
  currentUser: any;
  sortBy: 'score' | 'newest' | 'oldest' = 'score';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postsService: CommunityPostsService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const postIdParam = this.route.snapshot.paramMap.get('postId');
    if (postIdParam) {
      this.postId = postIdParam;
      this.loadPost();
      this.loadComments();
    } else {
      this.router.navigate(['/communities']);
    }

    this.currentUser = this.authService.getCurrentUser();
  }

  loadPost(): void {
    this.isLoading = true;
    this.postsService.getPost(this.postId).subscribe({
      next: (post) => {
        this.post = post;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du post:', error);
        this.isLoading = false;
        this.router.navigate(['/communities']);
      },
    });
  }

  loadComments(): void {
    this.postsService
      .getCommentsByPost(this.postId, this.page, this.limit, this.sortBy)
      .subscribe({
        next: (response) => {
          if (this.page === 1) {
            this.comments = response.comments;
          } else {
            this.comments = [...this.comments, ...response.comments];
          }
          this.total = response.total;
          this.totalPages = response.totalPages;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des commentaires:', error);
        },
      });
  }

  addComment(): void {
    if (!this.newComment.trim()) return;

    this.isLoading = true;
    this.postsService
      .addComment(this.postId, {
        content: this.newComment,
        commentType: 'general',
      })
      .subscribe({
        next: () => {
          this.loadComments();
          this.newComment = '';
          this.isLoading = false;
        },
        error: (error) => {
          console.error("Erreur lors de l'ajout du commentaire:", error);
          this.isLoading = false;
        },
      });
  }

  votePost(voteType: 'up' | 'down'): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('Vous devez être connecté pour voter');
      return;
    }

    this.postsService.votePost(this.postId, voteType).subscribe({
      next: (response) => {
        if (this.post) {
          this.post.score = response.newScore;
          this.post.upvotes = response.upvotes;
          this.post.downvotes = response.downvotes;
          this.post.userVote = response.userVote;
        }
      },
      error: (error) => console.error('Erreur de vote:', error),
    });
  }

  voteComment(commentId: string, voteType: 'up' | 'down'): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('Vous devez être connecté pour voter');
      return;
    }

    this.postsService.voteComment(commentId, voteType).subscribe({
      next: (response) => {
        const comment = this.comments.find((c) => c._id === commentId);
        if (comment) {
          comment.score = response.newScore;
          comment.upvotes = response.upvotes;
          comment.downvotes = response.downvotes;
          comment.userVote = response.userVote;
        }
      },
      error: (error) => console.error('Erreur de vote:', error),
    });
  }

  acceptAnswer(commentId: string): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.postsService.acceptAnswer(this.postId, commentId).subscribe({
      next: (response) => {
        // Mettre à jour les commentaires pour refléter la réponse acceptée
        this.comments.forEach((comment) => {
          comment.isAccepted = comment._id === commentId;
        });
        console.log(response.message);
      },
      error: (error) => console.error('Erreur acceptation réponse:', error),
    });
  }

  deleteComment(commentId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      this.postsService.deleteComment(commentId).subscribe({
        next: () => this.loadComments(),
        error: (error) => console.error('Erreur de suppression:', error),
      });
    }
  }

  deletePost(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
      if (this.post) {
        this.postsService.deletePost(this.post._id).subscribe({
          next: () => {
            // Rediriger vers la liste des publications de la communauté
            if (this.post && this.post.communityId) {
              this.router.navigate(['/communities', this.post.communityId._id]);
            } else {
              this.router.navigate(['/communities']);
            }
          },
          error: (error) => console.error('Erreur de suppression:', error),
        });
      }
    }
  }

  onSortChange(newSort: 'score' | 'newest' | 'oldest'): void {
    this.sortBy = newSort;
    this.page = 1;
    this.loadComments();
  }

  loadMoreComments(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadComments();
    }
  }

  // Méthodes utilitaires
  canDeleteComment(comment: Comment): boolean {
    return (
      this.currentUser &&
      (this.currentUser._id === comment.authorId._id ||
        this.currentUser.role === 'admin')
    );
  }

  canDeletePost(): boolean {
    return (
      this.post &&
      this.currentUser &&
      (this.currentUser._id === this.post.authorId._id ||
        this.currentUser.role === 'admin')
    );
  }

  canAcceptAnswer(): boolean {
    return (
      this.post &&
      this.post.postType === 'question' &&
      this.currentUser &&
      this.currentUser._id === this.post.authorId._id
    );
  }

  // Méthodes de compatibilité (pour transition en douceur)
  likePost(): void {
    this.votePost('up');
  }

  likeComment(commentId: string): void {
    this.voteComment(commentId, 'up');
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

  // Épingler/dépingler une publication
  togglePinPost(): void {
    if (!this.authService.isAuthenticated() || !this.post) {
      return;
    }

    this.postsService.togglePinPost(this.postId).subscribe({
      next: (response) => {
        if (this.post) {
          this.post.isPinned = response.isPinned;
        }
        console.log(response.message);
      },
      error: (error) => console.error('Erreur épinglage:', error),
    });
  }
}
