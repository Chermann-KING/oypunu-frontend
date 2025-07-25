// models/community-post.model.ts
export interface Author {
  _id: string;
  username: string;
  profilePicture?: string;
}

export interface Community {
  _id: string;
  name: string;
}

export interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: Author;
  communityId: Community;

  // Nouveau système de scores StackOverflow
  score: number; // Score total (upvotes - downvotes)
  upvotes: number; // Nombre de votes positifs
  downvotes: number; // Nombre de votes négatifs
  views: number; // Nombre de vues
  commentsCount: number;

  // Champs de qualité et modération
  status: 'active' | 'locked' | 'archived' | 'deleted';
  isPinned: boolean; // Post épinglé par les modérateurs
  isHighQuality: boolean; // Marqué comme contenu de haute qualité
  lastActivityAt: Date; // Dernière activité

  // Informations linguistiques spécifiques
  postType:
    | 'question'
    | 'explanation'
    | 'etymology'
    | 'usage'
    | 'translation'
    | 'discussion';
  languages: string[]; // Langues concernées par le post
  targetWord?: string; // Mot principal du post
  difficulty: 'beginner' | 'intermediate' | 'advanced'; // Niveau de difficulté

  tags?: string[];
  createdAt: Date;

  // Vote de l'utilisateur actuel
  userVote?: 'up' | 'down' | null;

  // Compatibilité (pour transition en douceur)
  likesCount?: number; // Sera mappé à upvotes
  isLiked?: boolean; // Sera mappé à userVote === 'up'
}

export interface Comment {
  _id: string;
  content: string;
  authorId: Author;
  postId: string;

  // Système de score StackOverflow pour commentaires
  score: number; // Score total (upvotes - downvotes)
  upvotes: number; // Nombre de votes positifs
  downvotes: number; // Nombre de votes négatifs

  parentCommentId?: string; // Pour les réponses
  repliesCount: number; // Nombre de réponses

  // Champs de qualité et modération
  status: 'active' | 'deleted' | 'hidden';
  isAccepted: boolean; // Commentaire accepté comme réponse
  isHighQuality: boolean; // Marqué comme commentaire de haute qualité
  isPinned: boolean; // Commentaire épinglé

  // Métadonnées pour l'apprentissage linguistique
  commentType:
    | 'correction'
    | 'explanation'
    | 'example'
    | 'translation'
    | 'general';
  mentionedWords: string[]; // Mots mentionnés dans le commentaire
  containsCorrection: boolean; // Le commentaire contient des corrections

  createdAt: Date;

  // Vote de l'utilisateur actuel
  userVote?: 'up' | 'down' | null;

  // Réponses (si chargées)
  replies?: Comment[];

  // Compatibilité (pour transition en douceur)
  likesCount?: number; // Sera mappé à upvotes
  isLiked?: boolean; // Sera mappé à userVote === 'up'
}

export interface PostFormData {
  title: string;
  content: string;
  postType:
    | 'question'
    | 'explanation'
    | 'etymology'
    | 'usage'
    | 'translation'
    | 'discussion';
  languages?: string[];
  tags: string[];
  targetWord?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface CommentFormData {
  content: string;
  commentType?:
    | 'correction'
    | 'explanation'
    | 'example'
    | 'translation'
    | 'general';
  parentCommentId?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
}

export interface PostsResponse extends PaginatedResponse<Post> {
  posts: Post[];
}

export interface PostDetailResponse {
  post: Post;
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Nouveau système de votes
export interface VoteResponse {
  success: boolean;
  newScore: number;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  message: string;
}

// Interface pour les filtres de posts
export interface PostFilters {
  sortBy?: 'score' | 'newest' | 'oldest' | 'activity' | 'controversial';
  postType?: string;
  languages?: string[];
  difficulty?: string;
  tags?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

// Statistiques de communauté
export interface CommunityStats {
  totalPosts: number;
  totalComments: number;
  totalScore: number;
  averageScore: number;
  topContributors: {
    username: string;
    profilePicture?: string;
    totalPosts: number;
    totalScore: number;
    averageScore: number;
  }[];
  postsByType: {
    _id: string;
    count: number;
    averageScore: number;
  }[];
}

// Compatibilité (remplace LikeResponse)
export interface LikeResponse extends VoteResponse {}
