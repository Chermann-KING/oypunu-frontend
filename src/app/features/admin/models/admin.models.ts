/**
 * @fileoverview Modèles TypeScript pour le module Admin
 *
 * Définit toutes les interfaces, types et enums nécessaires pour le module
 * d'administration, suivant les principes SOLID et la séparation des responsabilités.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

// ===== ÉNUMÉRATIONS =====

/**
 * Rôles utilisateur dans le système
 */
export enum UserRole {
  USER = 'user',
  CONTRIBUTOR = 'contributor',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

/**
 * Statuts de modération pour les contenus
 */
export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Types d'activité dans le système
 */
export enum ActivityType {
  USER_LOGIN = 'user_login',
  USER_REGISTRATION = 'user_registration',
  WORD_SUBMITTED = 'word_submitted',
  WORD_APPROVED = 'word_approved',
  WORD_REJECTED = 'word_rejected',
  USER_SUSPENDED = 'user_suspended',
  ROLE_CHANGED = 'role_changed',
  COMMUNITY_CREATED = 'community_created',
  COMMUNITY_DELETED = 'community_deleted',
}

// ===== INTERFACES UTILISATEUR =====

/**
 * Utilisateur complet avec toutes les propriétés
 */
export interface User {
  readonly id: string; // Alias pour _id pour compatibilité frontend
  readonly _id: string;
  readonly username: string;
  readonly email: string;
  role: UserRole;
  readonly status: 'active' | 'suspended' | 'banned'; // Statut utilisateur
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLogin?: Date;
  readonly lastLoginAt?: Date; // Alias pour lastLogin
  readonly profile?: UserProfile;
  readonly stats?: UserStats;
  readonly firstName?: string; // Propriétés directes pour faciliter l'usage
  readonly lastName?: string;
  readonly profilePicture?: string;
}

/**
 * Profil utilisateur détaillé
 */
export interface UserProfile {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly bio?: string;
  readonly avatar?: string;
  readonly location?: string;
  readonly website?: string;
}

/**
 * Statistiques utilisateur
 */
export interface UserStats {
  readonly totalWords: number;
  readonly approvedWords: number;
  readonly pendingWords: number;
  readonly rejectedWords: number;
  readonly totalViews: number;
  readonly contributionRank: number;
}

/**
 * Données de suspension d'utilisateur
 */
export interface UserSuspension {
  readonly suspend: boolean;
  readonly reason?: string;
  readonly suspendUntil?: Date;
}

/**
 * Changement de rôle utilisateur
 */
export interface UserRoleChange {
  readonly role: UserRole;
  readonly reason?: string;
}

// ===== INTERFACES MODÉRATION =====

/**
 * Mot en attente de modération
 */
export interface PendingWord {
  readonly id: string; // Alias pour _id pour compatibilité frontend
  readonly _id: string;
  readonly word: string;
  readonly language: string;
  readonly definition: string; // Définition principale
  readonly meanings: WordMeaning[];
  readonly examples?: WordExample[];
  readonly etymology?: string; // Étymologie du mot
  readonly status: ModerationStatus;
  readonly submittedBy: User; // Alias de createdBy pour clarté
  readonly createdBy: User;
  readonly submittedAt: Date; // Alias de createdAt pour clarté
  readonly createdAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly moderationReason?: string;
}

/**
 * Signification d'un mot
 */
export interface WordMeaning {
  readonly definition: string;
  readonly partOfSpeech?: string;
  readonly context?: string;
}

/**
 * Exemple d'utilisation d'un mot
 */
export interface WordExample {
  readonly sentence: string;
  readonly translation?: string;
  readonly context?: string;
}

// ===== INTERFACES POUR TOUS LES TYPES DE CONTENU MODÉRABLE =====

/**
 * Types de contenu modérable étendus
 */
export enum ModerableContentType {
  WORD = 'word',
  DEFINITION = 'definition', 
  COMMENT = 'comment',
  COMMUNITY_POST = 'community_post',
  PRIVATE_MESSAGE = 'private_message',
  USER_PROFILE = 'user_profile',
  MEDIA_CONTENT = 'media_content',
  LANGUAGE = 'language',
  CATEGORY = 'category',
  REPORT = 'report'
}

/**
 * Raisons de signalement
 */
export enum ReportReason {
  INAPPROPRIATE = 'inappropriate',
  SPAM = 'spam', 
  INCORRECT = 'incorrect',
  OFFENSIVE = 'offensive',
  COPYRIGHT = 'copyright',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  MISINFORMATION = 'misinformation',
  OTHER = 'other'
}

/**
 * Niveaux de sévérité
 */
export enum ReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Statuts des signalements
 */
export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated'
}

/**
 * Post de communauté en attente de modération
 */
export interface PendingCommunityPost {
  readonly id: string;
  readonly _id: string;
  readonly title: string;
  readonly content: string;
  readonly community: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  };
  readonly author: User;
  readonly attachments?: MediaAttachment[];
  readonly tags?: string[];
  readonly status: ModerationStatus;
  readonly createdAt: Date;
  readonly reportCount: number;
  readonly autoFlagged: boolean;
  readonly flaggedReason?: string;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly moderationReason?: string;
}

/**
 * Message privé signalé
 */
export interface ReportedPrivateMessage {
  readonly id: string;
  readonly _id: string;
  readonly content: string;
  readonly sender: User;
  readonly recipient: User;
  readonly conversationId: string;
  readonly reportedBy: User;
  readonly reportReason: ReportReason;
  readonly reportDescription?: string;
  readonly status: ReportStatus;
  readonly severity: ReportSeverity;
  readonly createdAt: Date;
  readonly reportedAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly actionTaken?: string;
}

/**
 * Profil utilisateur signalé
 */
export interface ReportedUserProfile {
  readonly id: string;
  readonly _id: string;
  readonly user: User;
  readonly reportedFields: {
    readonly bio?: boolean;
    readonly avatar?: boolean;
    readonly coverPhoto?: boolean;
    readonly username?: boolean;
    readonly displayName?: boolean;
  };
  readonly reportedBy: User;
  readonly reportReason: ReportReason;
  readonly reportDescription?: string;
  readonly status: ReportStatus;
  readonly severity: ReportSeverity;
  readonly reportedAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly actionTaken?: string;
}

/**
 * Commentaire signalé
 */
export interface ReportedComment {
  readonly id: string;
  readonly _id: string;
  readonly content: string;
  readonly author: User;
  readonly targetType: 'word' | 'community_post' | 'user_profile';
  readonly targetId: string;
  readonly targetTitle?: string;
  readonly parentComment?: string;
  readonly reportedBy: User;
  readonly reportReason: ReportReason;
  readonly reportDescription?: string;
  readonly status: ReportStatus;
  readonly severity: ReportSeverity;
  readonly createdAt: Date;
  readonly reportedAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly actionTaken?: string;
}

/**
 * Contenu multimédia signalé
 */
export interface ReportedMediaContent {
  readonly id: string;
  readonly _id: string;
  readonly mediaType: 'image' | 'audio' | 'video' | 'document';
  readonly filename: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly uploadedBy: User;
  readonly associatedContent?: {
    readonly type: ModerableContentType;
    readonly id: string;
    readonly title?: string;
  };
  readonly reportedBy: User;
  readonly reportReason: ReportReason;
  readonly reportDescription?: string;
  readonly status: ReportStatus;
  readonly severity: ReportSeverity;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly uploadedAt: Date;
  readonly reportedAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly actionTaken?: string;
}

/**
 * Contenu auto-détecté par IA
 */
export interface AIFlaggedContent {
  readonly id: string;
  readonly _id: string;
  readonly contentType: ModerableContentType;
  readonly contentId: string;
  readonly content: string;
  readonly author: User;
  readonly aiModel: string;
  readonly confidence: number; // 0-100
  readonly flaggedReasons: ReportReason[];
  readonly detectedAt: Date;
  readonly status: ReportStatus;
  readonly severity: ReportSeverity;
  readonly reviewedBy?: User;
  readonly reviewedAt?: Date;
  readonly humanOverride?: boolean;
  readonly finalDecision?: 'approve' | 'reject' | 'needs_human_review';
}

/**
 * Pièce jointe multimédia
 */
export interface MediaAttachment {
  readonly id: string;
  readonly filename: string;
  readonly url: string;
  readonly mimeType: string;
  readonly size: number;
  readonly thumbnailUrl?: string;
}

/**
 * Langue en attente de modération
 */
export interface PendingLanguage {
  readonly id: string;
  readonly _id: string;
  readonly name: string;
  readonly nativeName?: string;
  readonly code?: string; // Code ISO langue
  readonly region: string;
  readonly country: string;
  readonly family?: string; // Famille linguistique
  readonly status: ModerationStatus;
  readonly systemStatus: 'pending_approval' | 'approved' | 'rejected';
  readonly submittedBy: User;
  readonly createdBy: User;
  readonly submittedAt: Date;
  readonly createdAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly moderationReason?: string;
  readonly isActive: boolean;
  readonly isFeatured: boolean;
  readonly priority: number;
  readonly stats?: {
    readonly totalWords: number;
    readonly totalSpeakers?: number;
  };
}

/**
 * Interface pour une catégorie en attente de modération
 * Soumise par un contributeur et en attente d'approbation par un admin
 */
export interface PendingCategory {
  readonly id: string;
  readonly _id: string;
  readonly name: string;
  readonly description?: string;
  readonly languageId: string;
  readonly language?: string; // Nom de la langue pour l'affichage
  readonly order: number;
  readonly systemStatus: ModerationStatus;
  readonly submittedBy: User;
  readonly submittedAt: Date;
  readonly moderatedBy?: User;
  readonly moderatedAt?: Date;
  readonly moderationReason?: string;
  readonly moderationNotes?: string;
  readonly isVisible: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ===== INTERFACES CATÉGORIES =====

/**
 * Interface pour une catégorie
 */
export interface CategoryAdmin {
  readonly id: string;
  readonly _id: string;
  readonly name: string;
  readonly description?: string;
  readonly languageId: string; // Maintenant requis pour cohérence
  readonly language?: string; // Legacy field
  readonly isActive: boolean;
  readonly order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly wordCount?: number;
  // Champs de modération - pour les contributeurs
  readonly systemStatus: ModerationStatus;
  readonly moderatedBy?: string;
  readonly moderatedAt?: Date;
  readonly moderationNotes?: string;
  readonly submittedBy?: string;
  readonly isVisible?: boolean; // Contrôle la visibilité après approbation
}

/**
 * Interface pour créer une nouvelle catégorie
 */
export interface CreateCategoryData {
  readonly name: string;
  readonly description?: string;
  readonly languageId: string;
  readonly isActive?: boolean;
  readonly order?: number;
}

/**
 * Interface pour modifier une catégorie
 */
export interface UpdateCategoryData {
  readonly name?: string;
  readonly description?: string;
  readonly languageId?: string;
  readonly isActive?: boolean;
  readonly order?: number;
}


/**
 * Union de tous les types de contenu modérable
 */
export type ModerableContent = 
  | PendingWord
  | PendingCommunityPost  
  | ReportedPrivateMessage
  | ReportedUserProfile
  | ReportedComment
  | ReportedMediaContent
  | AIFlaggedContent
  | PendingLanguage
  | PendingCategory;

/**
 * Action de modération
 */
export interface ModerationAction {
  readonly action: 'approve' | 'reject' | 'escalate';
  readonly reason?: string;
  readonly notes?: string;
}

// ===== INTERFACES COMMUNAUTÉS =====

/**
 * Communauté
 */
export interface Community {
  readonly _id: string;
  readonly name: string;
  readonly description: string;
  readonly language: string;
  readonly isActive: boolean;
  readonly memberCount: number;
  readonly postCount: number;
  readonly createdBy: User;
  readonly createdAt: Date;
  readonly moderators: User[];
}

// ===== INTERFACES ACTIVITÉ =====

/**
 * Activité dans le système
 */
export interface SystemActivity {
  readonly _id: string;
  readonly type: ActivityType;
  readonly user: User;
  readonly target?: ActivityTarget;
  readonly description: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, any>;
}

/**
 * Cible d'une activité
 */
export interface ActivityTarget {
  readonly type: string;
  readonly id: string;
  readonly name: string;
}

// ===== INTERFACES RÉVISIONS =====

/**
 * Révision de mot
 */
export interface WordRevision {
  readonly _id: string;
  readonly wordId: string;
  readonly word: string;
  readonly language: string;
  readonly changes: Record<string, any>;
  readonly createdBy: User;
  readonly createdAt: Date;
  readonly status: ModerationStatus;
  readonly reviewedBy?: User;
  readonly reviewedAt?: Date;
  readonly reviewNotes?: string;
  readonly version: number;
  readonly comment?: string;
}

/**
 * Statistiques des révisions
 */
export interface RevisionStatistics {
  readonly totalRevisions: number;
  readonly byStatus: {
    readonly pending: number;
    readonly approved: number;
    readonly rejected: number;
  };
  readonly byPeriod: {
    readonly today: number;
    readonly thisWeek: number;
    readonly thisMonth: number;
    readonly lastMonth: number;
  };
  readonly approvalRate: number;
  readonly averageReviewTime: number;
  readonly topContributors: ContributorStats[];
  readonly mostActiveWords: ActiveWordStats[];
  readonly qualityMetrics: QualityMetrics;
}

/**
 * Statistiques contributeur
 */
export interface ContributorStats {
  readonly userId: string;
  readonly username: string;
  readonly revisionCount: number;
  readonly approvalRate: number;
}

/**
 * Statistiques mots actifs
 */
export interface ActiveWordStats {
  readonly wordId: string;
  readonly word: string;
  readonly revisionCount: number;
  readonly lastRevision: Date;
}

/**
 * Métriques de qualité
 */
export interface QualityMetrics {
  readonly averageChangesPerRevision: number;
  readonly mostCommonChangeType: string;
  readonly revisionTrend: 'increasing' | 'decreasing' | 'stable';
}

// ===== INTERFACES FILTRES ET PAGINATION =====

/**
 * Filtres pour la liste des utilisateurs
 */
export interface UserFilters {
  readonly role?: UserRole;
  readonly status?: 'active' | 'suspended' | 'banned' | 'all';
  readonly search?: string;
}

/**
 * Filtres pour les mots en attente
 */
export interface PendingWordFilters {
  readonly language?: string;
  readonly status?: ModerationStatus;
  readonly search?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

/**
 * Filtres pour les communautés
 */
export interface CommunityFilters {
  readonly status?: 'active' | 'inactive';
  readonly language?: string;
  readonly search?: string;
}

/**
 * Filtres pour l'activité
 */
export interface ActivityFilters {
  readonly type?: ActivityType;
  readonly userId?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

/**
 * Paramètres de pagination
 */
export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
}

/**
 * Réponse paginée générique
 */
export interface PaginatedResponse<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

// ===== INTERFACES RÉPONSES API =====

/**
 * Réponse API générique
 */
export interface ApiResponse<T = any> {
  readonly success: boolean;
  readonly message: string;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: Date;
}

/**
 * Statistiques du dashboard admin
 */
export interface DashboardStats {
  /** Nombre total d'utilisateurs inscrits */
  readonly totalUsers: number;
  /** Nombre d'utilisateurs actifs (connexion récente) */
  readonly activeUsers: number;
  /** Nombre d'utilisateurs suspendus */
  readonly suspendedUsers: number;
  /** Nombre total de mots dans le dictionnaire */
  readonly totalWords: number;
  /** Nombre de mots en attente de modération */
  readonly pendingWords: number;
  /** Nombre de mots approuvés */
  readonly approvedWords: number;
  /** Nombre de mots rejetés */
  readonly rejectedWords: number;
  /** Nombre total de communautés */
  readonly totalCommunities: number;
  /** Nombre de communautés actives */
  readonly activeCommunities: number;
  /** Nombre total de posts de communauté */
  readonly totalPosts: number;
  /** Nombre total de messages échangés */
  readonly totalMessages: number;
  /** Nouveaux utilisateurs ce mois-ci */
  readonly newUsersThisMonth: number;
  /** Nouveaux mots cette semaine */
  readonly newWordsThisWeek: number;
}

/**
 * Données pour un tableau de bord spécialisé
 */
export interface SpecializedDashboard {
  readonly contributor?: ContributorDashboard;
  readonly admin?: AdminDashboard;
  readonly superadmin?: SuperAdminDashboard;
}

/**
 * Dashboard pour contributeurs
 */
export interface ContributorDashboard {
  readonly pendingWords: number;
  readonly approvedWords: number;
  readonly rejectedWords: number;
  readonly newWordsThisWeek: number;
}

/**
 * Dashboard pour administrateurs
 */
export interface AdminDashboard {
  readonly stats: DashboardStats;
  readonly recentActivity: SystemActivity[];
}

/**
 * Dashboard pour super-administrateurs
 */
export interface SuperAdminDashboard {
  readonly stats: DashboardStats;
  readonly recentActivity: SystemActivity[];
  readonly systemHealth: {
    readonly uptime: number;
    readonly memory: {
      readonly rss: number;        // Resident Set Size
      readonly heapTotal: number;  // Total heap allocated
      readonly heapUsed: number;   // Heap actually used
      readonly external: number;   // Memory used by C++ objects
      readonly arrayBuffers: number; // Array buffers memory
    };
    readonly nodeVersion: string;
  };
  readonly languageStats?: {
    readonly totalLanguages: number;
    readonly activeLanguages: number;
    readonly pendingLanguages: number;
    readonly approvedLanguages: number;
    readonly byStatus: any[];
    readonly wordsByLanguage: any[];
  };
  readonly categoryStats?: {
    readonly totalCategories: number;
    readonly activeCategories: number;
    readonly pendingCategories: number;
    readonly approvedCategories: number;
    readonly byStatus: any[];
    readonly wordsByCategory: any[];
  };
  readonly contentStats?: any;
}

/**
 * Log système
 */
export interface SystemLog {
  readonly _id: string;
  readonly level: 'info' | 'warn' | 'error' | 'critical';
  readonly message: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly metadata?: Record<string, any>;
}

// ===== TYPES UTILITAIRES =====

/**
 * Période de temps pour les filtres
 */
export type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Format d'export
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Type d'export
 */
export type ExportType = 'users' | 'content' | 'communities' | 'full';

/**
 * Statut de tâche asynchrone
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Tâche asynchrone
 */
export interface AsyncTask {
  readonly id: string;
  readonly type: string;
  readonly status: TaskStatus;
  readonly progress: number;
  readonly result?: any;
  readonly error?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ===== INTERFACES ANALYTICS =====

/**
 * Métriques du dashboard analytics
 */
export interface DashboardMetrics {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly totalWords: number;
  readonly pendingWords: number;
  readonly totalCommunities: number;
  readonly activeCommunities: number;
  readonly systemHealth: 'healthy' | 'warning' | 'critical';
  readonly lastUpdate: Date;
}

/**
 * Statistiques d'activité utilisateur
 */
export interface UserActivityStats {
  readonly activeUsers: number;
  readonly newUsers: number;
  readonly averageSessionDuration: number;
  readonly retentionRate: number;
  readonly loginFrequency: number;
  readonly topUsersByActivity: {
    readonly userId: string;
    readonly username: string;
    readonly activityScore: number;
  }[];
}

/**
 * Analytics de contenu
 */
export interface ContentAnalytics {
  readonly wordsAdded: number;
  readonly wordsApproved: number;
  readonly wordsRejected: number;
  readonly approvalRate: number;
  readonly popularWords: number;
  readonly topLanguages: {
    readonly name: string;
    readonly count: number;
    readonly percentage: number;
  }[];
  readonly contentTrends: {
    readonly date: Date;
    readonly submissions: number;
    readonly approvals: number;
  }[];
}

/**
 * Données statistiques par langue
 */
export interface LanguageData {
  readonly language: string;
  readonly count: number;
  readonly percentage: number;
}

/**
 * Statistiques complètes des langues
 */
export interface LanguageStatistics {
  readonly totalLanguages: number;
  readonly activeLanguages: number;
  readonly pendingLanguages: number;
  readonly approvedLanguages: number;
  readonly wordsByLanguage: LanguageData[];
  readonly communitiesByLanguage: LanguageData[];
  readonly mostActiveLanguage: string;
  readonly languageGrowthTrend: {
    readonly date: Date;
    readonly newLanguages: number;
    readonly totalWords: number;
  }[];
}

/**
 * Analytics des communautés
 */
export interface CommunityAnalytics {
  readonly activeCommunities: number;
  readonly newCommunities: number;
  readonly averageEngagement: number;
  readonly postsPerDay: number;
  readonly topCommunities: {
    readonly id: string;
    readonly name: string;
    readonly memberCount: number;
    readonly activityScore: number;
  }[];
  readonly engagementTrends: {
    readonly date: Date;
    readonly posts: number;
    readonly interactions: number;
  }[];
}

/**
 * Métriques système
 */
export interface SystemMetrics {
  readonly uptime: number;
  readonly requestsPerMinute: number;
  readonly averageResponseTime: number;
  readonly activeConnections: number;
  readonly errorRate: number;
  readonly memoryUsage: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly diskUsage: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly performanceTrends: {
    readonly timestamp: Date;
    readonly responseTime: number;
    readonly throughput: number;
  }[];
}
