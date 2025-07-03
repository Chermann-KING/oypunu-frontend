export interface Translation {
  id: string;
  language: string;
  translatedWord: string;
  context?: string[];
  confidence: number;
  votes: number;
  validationType: 'auto' | 'manual' | 'learned';
  targetWordId?: string;
  senseId?: string;
  createdAt: Date;
  createdBy?: {
    id: string;
    username: string;
  };
  validatedBy?: {
    id: string;
    username: string;
  };
}

export interface AvailableLanguage {
  code: string;
  name: string;
  translationCount: number;
  averageQuality: number;
}

export interface TranslationSuggestion {
  wordId: string;
  word: string;
  language: string;
  similarityScore: number;
  definition: string;
  suggestedAction: 'merge' | 'separate' | 'uncertain';
  sharedKeywords?: string[];
  sameCategory: boolean;
  categoryName?: string;
}

export interface TranslationGroup {
  conceptId: string;
  primaryWord: string;
  primaryLanguage: string;
  totalTranslations: number;
  qualityScore: number;
  availableLanguages: string[];
  translations: Translation[];
}

export interface ValidationResult {
  success: boolean;
  action: string;
  message: string;
  translationGroupId?: string;
  finalConfidence?: number;
  affectedTranslations?: number;
}

export interface LanguageStats {
  language: string;
  totalWords: number;
  translatedWords: number;
  coveragePercentage: number;
  averageQuality: number;
  pendingTranslations: number;
  mostTranslatedFrom: string[];
}

// DTOs pour les requêtes
export interface CreateTranslationRequest {
  sourceWordId: string;
  targetLanguage: string;
  translatedWord: string;
  targetWordId?: string;
  context?: string[];
  confidence?: number;
  senseId?: string;
  validationType?: 'auto' | 'manual' | 'learned';
}

export interface ValidateTranslationRequest {
  action: 'merge' | 'separate' | 'uncertain';
  reason?: string;
  adjustedConfidence?: number;
}

export interface VoteTranslationRequest {
  voteValue: number; // +1 ou -1
  comment?: string;
}

export interface SearchTranslationRequest {
  wordId: string;
  targetLanguage: string;
  searchTerm?: string;
  minSimilarity?: number;
}

// Interface pour le composant de sélection de langue
export interface LanguageOption {
  code: string;
  name: string;
  flag?: string; // Code emoji du drapeau ou URL d'image
  hasTranslations?: boolean;
  translationCount?: number;
}

// Interface pour l'état de chargement des traductions
export interface TranslationState {
  loading: boolean;
  error: string | null;
  translations: Translation[];
  availableLanguages: AvailableLanguage[];
  suggestions: TranslationSuggestion[];
  selectedLanguage: string | null;
}

// Interface pour les notifications de traduction
export interface TranslationNotification {
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
  details?: string;
  action?: 'merge' | 'separate' | 'vote' | 'create';
  translationId?: string;
  autoHide?: boolean;
}

// Interface pour la modal de confirmation de similarité
export interface SimilarityConfirmation {
  isVisible: boolean;
  sourceWord: string;
  suggestions: TranslationSuggestion[];
  selectedSuggestion?: TranslationSuggestion;
  userDecision?: 'merge' | 'separate' | 'new';
}

// Interface pour les statistiques d'apprentissage (admin)
export interface LearningInsights {
  categoryAccuracy: number;
  semanticAccuracy: number;
  overallAccuracy: number;
  recommendedThresholds: {
    autoMerge: number;
    askUser: number;
    autoSeparate: number;
  };
  commonPatterns: {
    pattern: string;
    accuracy: number;
    count: number;
  }[];
}