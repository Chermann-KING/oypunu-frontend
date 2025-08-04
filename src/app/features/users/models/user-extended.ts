import { User } from '../../../core/models/user';

/**
 * Interface étendue pour les données de profil utilisateur complètes (privées)
 */
export interface UserProfileResponse extends User {
  /** Adresse email (données privées) */
  email: string;
  /** Statut de vérification de l'email */
  isEmailVerified?: boolean;
  /** Visibilité du profil */
  isProfilePublic?: boolean;
}

/**
 * Interface pour les données de mise à jour du profil
 */
export interface UpdateProfileDto {
  /** Nom d'utilisateur */
  username?: string;
  /** Langue maternelle (code ISO) */
  nativeLanguage?: string;
  /** Langues en apprentissage (codes ISO) */
  learningLanguages?: string[];
  /** URL de la photo de profil */
  profilePicture?: string;
  /** Biographie utilisateur */
  bio?: string;
  /** Localisation géographique */
  location?: string;
  /** Site web personnel */
  website?: string;
  /** Visibilité du profil */
  isProfilePublic?: boolean;
}

/**
 * Interface pour les statistiques détaillées d'un utilisateur
 */
export interface UserStatsExtended {
  /** Nombre total de mots ajoutés */
  totalWordsAdded: number;
  /** Nombre total de posts communautaires */
  totalCommunityPosts: number;
  /** Nombre de mots favoris */
  favoriteWordsCount: number;
  /** Date d'inscription */
  joinDate: Date;
}

/**
 * Interface pour une contribution récente d'un utilisateur
 */
export interface UserContribution {
  /** Type de contribution */
  type: 'word' | 'translation' | 'vote' | 'comment';
  /** Identifiant de l'élément contribué */
  itemId: string;
  /** Titre ou nom de l'élément */
  title: string;
  /** Date de la contribution */
  contributedAt: Date;
  /** Langue associée */
  language?: string;
  /** Statut de la contribution */
  status?: 'pending' | 'approved' | 'rejected';
}

/**
 * Interface pour une consultation récente d'un utilisateur
 */
export interface UserConsultation {
  /** Type d'élément consulté */
  type: 'word' | 'community' | 'user';
  /** Identifiant de l'élément consulté */
  itemId: string;
  /** Titre ou nom de l'élément */
  title: string;
  /** Date de la consultation */
  consultedAt: Date;
  /** Langue associée (si applicable) */
  language?: string;
}

/**
 * Interface pour les analytics des contributeurs en ligne
 */
export interface OnlineContributorsStats {
  /** Nombre de contributeurs actuellement en ligne */
  onlineContributors: number;
  /** Nombre total d'utilisateurs actifs */
  activeUsers: number;
  /** Timestamp de la mesure */
  timestamp: string;
}

/**
 * Interface pour la réponse de recherche d'utilisateurs
 */
export interface UserSearchResponse {
  /** Liste des utilisateurs trouvés */
  users: User[];
  /** Nombre total de résultats */
  total: number;
  /** Page actuelle */
  page: number;
  /** Limite par page */
  limit: number;
}

/**
 * Interface pour les paramètres de recherche d'utilisateurs
 */
export interface UserSearchParams {
  /** Terme de recherche */
  search: string;
  /** Page à récupérer */
  page?: number;
  /** Nombre d'éléments par page */
  limit?: number;
  /** Filtrer par rôle */
  role?: string;
  /** Filtrer par langue native */
  nativeLanguage?: string;
  /** Filtrer par statut d'activité */
  isActive?: boolean;
}

/**
 * Interface pour la réponse d'upload d'avatar
 */
export interface AvatarUploadResponse {
  /** URL de l'avatar uploadé */
  url: string;
  /** Message de confirmation */
  message?: string;
}