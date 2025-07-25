// Types pour les recommandations intelligentes

export interface RecommendedWord {
  id: string;
  word: string;
  language: string;
  languageName: string;
  languageFlag: string;
  definition: string;
  score: number;
  reasons: string[];
  category: 'behavioral' | 'semantic' | 'community' | 'linguistic' | 'mixed';
  pronunciation?: string;
  examples: string[];
  audioUrl?: string;
  metadata: Record<string, any>;
}

export interface RecommendationsResponse {
  recommendations: RecommendedWord[];
  count: number;
  type: string;
  timestamp: string;
  fromCache: boolean;
  generationTimeMs: number;
  avgScore: number;
  algorithm: {
    type: string;
    weights: {
      behavioral: number;
      semantic: number;
      community: number;
      linguistic: number;
    };
  };
}

export interface RecommendationFeedback {
  wordId: string;
  feedbackType: 'like' | 'dislike' | 'not_interested' | 'view' | 'favorite';
  reason?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  impact: string;
  timestamp: string;
}

export interface RecommendationExplanation {
  wordId: string;
  score: number;
  factors: {
    behavioral: {
      score: number;
      details: string[];
    };
    semantic: {
      score: number;
      details: string[];
    };
    community: {
      score: number;
      details: string[];
    };
    linguistic: {
      score: number;
      details: string[];
    };
  };
  relatedWords: {
    id: string;
    word: string;
    language: string;
    similarity: number;
    reason: string;
  }[];
  alternatives: RecommendedWord[];
}

export interface RecommendationStats {
  totalRecommendationsSeen: number;
  totalClicked: number;
  totalFavorited: number;
  clickThroughRate: number;
  favoriteRate: number;
  topCategories: string[];
  topLanguages: string[];
  learningProgress: Record<string, number>;
  timestamp: string;
}

export interface RecommendationPreferences {
  algorithmWeights?: {
    behavioral?: number;
    semantic?: number;
    community?: number;
    linguistic?: number;
  };
  preferredCategories?: string[];
  languageProficiency?: Record<string, number>;
}

export interface TrendingRecommendationsParams {
  region?: string;
  limit?: number;
  period?: '24h' | '7d' | '30d';
}

export interface LinguisticRecommendationsParams {
  language: string;
  level?: number;
  limit?: number;
}

export interface PersonalRecommendationsParams {
  limit?: number;
  type?: 'personal' | 'trending' | 'linguistic' | 'semantic' | 'mixed';
  languages?: string[];
  categories?: string[];
  refresh?: boolean;
}

// Types pour les catégories de recommandations avec leurs icônes et couleurs
export interface RecommendationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
}

export const RECOMMENDATION_CATEGORIES: RecommendationCategory[] = [
  {
    id: 'behavioral',
    name: 'Basé sur vos goûts',
    description: 'Recommandations personnalisées selon votre historique',
    icon: '🧠',
    color: 'purple',
    gradient: 'from-purple-600 to-purple-800'
  },
  {
    id: 'semantic',
    name: 'Concepts similaires',
    description: 'Mots liés sémantiquement à vos consultations',
    icon: '🔗',
    color: 'blue',
    gradient: 'from-blue-600 to-blue-800'
  },
  {
    id: 'community',
    name: 'Tendances communauté',
    description: 'Mots populaires dans la communauté',
    icon: '📈',
    color: 'green',
    gradient: 'from-green-600 to-green-800'
  },
  {
    id: 'linguistic',
    name: 'Apprentissage langues',
    description: 'Mots adaptés à votre niveau linguistique',
    icon: '🌍',
    color: 'orange',
    gradient: 'from-orange-600 to-orange-800'
  },
  {
    id: 'mixed',
    name: 'Intelligent mixte',
    description: 'Combinaison optimale de tous les algorithmes',
    icon: '🎯',
    color: 'indigo',
    gradient: 'from-indigo-600 to-indigo-800'
  }
];

// Types pour les niveaux de confiance des recommandations
export enum RecommendationConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface RecommendationWithConfidence extends RecommendedWord {
  confidence: RecommendationConfidence;
  confidenceReason: string;
  isPersonalized: boolean;
  freshness: 'new' | 'recent' | 'trending' | 'classic';
}

// Types pour les filtres de recommandations
export interface RecommendationFilters {
  languages?: string[];
  categories?: string[];
  difficulty?: number[];
  minScore?: number;
  maxResults?: number;
  excludeViewed?: boolean;
  onlyFavorites?: boolean;
}

// Types pour l'historique des recommandations
export interface RecommendationHistory {
  id: string;
  recommendations: RecommendedWord[];
  generatedAt: Date;
  type: string;
  userFeedback?: {
    [wordId: string]: RecommendationFeedback;
  };
  performance: {
    viewRate: number;
    clickRate: number;
    favoriteRate: number;
  };
}