/**
 * Modèles complets pour le tableau de bord admin O'Ypunu
 * Couvre toutes les données exposées par l'API backend
 */

// Import UserRole from central location
import { UserRole } from '../../../core/models/admin';

export interface User {
  _id: string;
  username: string;
  email: string;
  isEmailVerified: boolean;
  role: UserRole;
  profilePicture?: string;
  lastActive: Date;
  favoriteWords: string[];
  nativeLanguageId?: string;
  learningLanguageIds: string[];
  bio?: string;
  location?: string;
  website?: string;
  isProfilePublic: boolean;
  totalWordsAdded: number;
  totalCommunityPosts: number;
  isActive: boolean;
  isSuspended: boolean;
  hasAcceptedTerms: boolean;
  hasAcceptedPrivacyPolicy: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Word {
  _id: string;
  word: string;
  languageId: string;
  languageName: string;
  pronunciation?: string;
  etymology?: string;
  meanings: Meaning[];
  createdBy: User;
  status: 'approved' | 'pending' | 'rejected';
  audioFilesCount: number;
  translationsCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
  examples: string[];
}

export interface Definition {
  text: string;
  examples: string[];
}

export interface Language {
  _id: string;
  name: string;
  nativeName: string;
  iso639_1?: string;
  region: string;
  countries: string[];
  status: 'major' | 'regional' | 'local' | 'liturgical' | 'extinct';
  systemStatus: 'active' | 'proposed' | 'deprecated';
  speakerCount: number;
  endangermentStatus?: string;
  proposedBy: User;
  approvedBy?: User;
  wordCount: number;
  userCount: number;
  contributorCount: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Community {
  _id: string;
  name: string;
  language: string;
  description: string;
  memberCount: number;
  createdBy: User;
  tags: string[];
  isPrivate: boolean;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContributorRequest {
  _id: string;
  userId: User;
  requestType: string;
  motivation: string;
  experience: string;
  languagesOfInterest: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: User;
  reviewNote?: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDashboardOverview {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalWords: number;
  pendingWords: number;
  approvedWords: number;
  rejectedWords: number;
  totalCommunities: number;
  activeCommunities: number;
  totalLanguages: number;
  pendingLanguages: number;
  totalContributorRequests: number;
  pendingContributorRequests: number;
  systemUptime: number;
  lastUpdate: Date;
}

export interface UserAnalyticsDetailed {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  usersByRole: Record<UserRole, number>;
  registrationTrends: {
    date: string;
    count: number;
  }[];
  topContributors: {
    user: User;
    contributionCount: number;
    lastContribution: Date;
  }[];
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  usersByLocation: {
    location: string;
    count: number;
  }[];
  suspendedUsers: number;
  unverifiedUsers: number;
}

export interface ContentAnalyticsDetailed {
  totalWords: number;
  wordsByStatus: {
    approved: number;
    pending: number;
    rejected: number;
  };
  wordsByLanguage: {
    language: Language;
    count: number;
    percentage: number;
  }[];
  contentTrends: {
    date: string;
    approved: number;
    pending: number;
    rejected: number;
  }[];
  moderationMetrics: {
    averageApprovalTime: number;
    approvalRate: number;
    rejectionRate: number;
    pendingQueue: number;
  };
  topLanguagesByContent: {
    language: Language;
    wordCount: number;
    contributorCount: number;
  }[];
  wordQualityMetrics: {
    avgDefinitionsPerWord: number;
    avgExamplesPerWord: number;
    wordsWithAudio: number;
    wordsWithEtymology: number;
  };
}

export interface CommunityAnalyticsDetailed {
  totalCommunities: number;
  activeCommunities: number;
  privateCommunities: number;
  communityGrowth: {
    date: string;
    total: number;
    active: number;
  }[];
  membershipStats: {
    totalMembers: number;
    avgMembersPerCommunity: number;
    mostActiveCommunities: {
      community: Community;
      memberCount: number;
      activityScore: number;
    }[];
  };
  communityEngagement: {
    communitiesWithNewPosts: number;
    avgPostsPerCommunity: number;
    topCommunityTags: {
      tag: string;
      count: number;
    }[];
  };
}

export interface SystemMetricsDetailed {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  databaseStats: {
    collections: number;
    totalDocuments: number;
    totalSize: number;
    avgResponseTime: number;
  };
  apiMetrics: {
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    mostUsedEndpoints: {
      endpoint: string;
      count: number;
      avgResponseTime: number;
    }[];
  };
  websocketStats: {
    connectedClients: number;
    messagesPerMinute: number;
    connectionErrors: number;
  };
  cacheStats: {
    hitRate: number;
    missRate: number;
    totalSize: number;
  };
}

export interface ActivityFeed {
  id: string;
  type:
    | 'user_registered'
    | 'word_created'
    | 'word_approved'
    | 'community_created'
    | 'contributor_request'
    | 'system_event';
  title: string;
  description: string;
  userId?: string;
  username?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface UserManagement {
  users: User[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    role?: UserRole;
    status?: 'active' | 'suspended' | 'inactive';
    verified?: boolean;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface ContentModeration {
  pendingWords: Word[];
  pendingRevisions: any[];
  totalPendingCount: number;
  moderationQueue: {
    word: Word;
    submittedAt: Date;
    waitingTime: number;
    priority: number;
  }[];
  moderationStats: {
    todayApproved: number;
    todayRejected: number;
    avgProcessingTime: number;
    backlogSize: number;
  };
}

export interface CommunityManagement {
  communities: Community[];
  totalCount: number;
  recentActivity: {
    community: Community;
    activityType: string;
    count: number;
    lastActivity: Date;
  }[];
  moderationAlerts: {
    community: Community;
    alertType: 'inappropriate_content' | 'inactive_admin' | 'mass_exodus';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
}

export interface ReportsAndExports {
  availableReports: {
    id: string;
    name: string;
    description: string;
    format: 'json' | 'csv' | 'pdf';
    estimatedSize: string;
    lastGenerated?: Date;
  }[];
  scheduledReports: {
    id: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    nextRun: Date;
    recipients: string[];
  }[];
}

export interface AdminPermissions {
  canViewUsers: boolean;
  canEditUsers: boolean;
  canSuspendUsers: boolean;
  canChangeUserRoles: boolean;
  canModerateContent: boolean;
  canManageCommunities: boolean;
  canViewAnalytics: boolean;
  canViewSystemMetrics: boolean;
  canExportData: boolean;
  canManageLanguages: boolean;
  canViewLogs: boolean;
  canManageSystem: boolean;
}

export interface DashboardSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  requiredRole: UserRole;
  requiredPermissions: string[];
  isEnabled: boolean;
  priority: number;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'list' | 'status';
  title: string;
  data: any;
  size: 'small' | 'medium' | 'large' | 'full';
  refreshInterval?: number;
  lastUpdated: Date;
}
