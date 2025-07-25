export enum ContributorRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review',
}

export enum ContributorRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface ActivityLogEntry {
  action: string;
  performedBy: {
    _id: string;
    username: string;
    email: string;
  };
  performedAt: Date;
  notes?: string;
  oldStatus?: ContributorRequestStatus;
  newStatus?: ContributorRequestStatus;
}

export interface ContributorRequest {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
    createdAt: Date;
    lastActive?: Date;
    totalWordsAdded?: number;
    totalCommunityPosts?: number;
  };
  username: string;
  email: string;
  motivation: string;
  experience?: string;
  languages?: string;
  commitment: boolean;
  status: ContributorRequestStatus;
  priority: ContributorRequestPriority;
  reviewedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;
  reviewCount: number;
  activityLog: ActivityLogEntry[];
  evaluationScore?: number;
  evaluationCriteria?: string[];
  skillsAssessment?: Record<string, number>;
  userWordsCount: number;
  userCommunityPostsCount: number;
  userJoinDate?: Date;
  userNativeLanguages: string[];
  userLearningLanguages: string[];
  isHighPriority: boolean;
  requiresSpecialReview: boolean;
  isRecommended: boolean;
  recommendedBy?: {
    _id: string;
    username: string;
    email: string;
  };
  recommendationNotes?: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  expiresAt?: Date;
  applicantNotified: boolean;
  lastNotificationSent?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContributorRequestFilters {
  status?: ContributorRequestStatus;
  priority?: ContributorRequestPriority;
  search?: string;
  reviewedBy?: string;
  highPriorityOnly?: boolean;
  specialReviewOnly?: boolean;
  maxDaysOld?: number;
  expiringSoon?: boolean;
}

export interface ContributorRequestListResponse {
  requests: ContributorRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statistics: {
    pending: number;
    approved: number;
    rejected: number;
    underReview: number;
    total: number;
    avgProcessingDays: number;
    approvalRate: number;
  };
}

export interface ContributorRequestStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  underReviewRequests: number;
  requestsThisMonth: number;
  requestsThisWeek: number;
  avgProcessingTime: number;
  approvalRate: number;
  topLanguages: Array<{ language: string; count: number }>;
  requestsByPriority: Record<ContributorRequestPriority, number>;
  expiringSoonCount: number;
}

export interface CreateContributorRequestDto {
  motivation: string;
  experience?: string;
  languages?: string;
  commitment: boolean;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
}

export interface ReviewContributorRequestDto {
  status: ContributorRequestStatus;
  reviewNotes?: string;
  rejectionReason?: string;
  evaluationScore?: number;
  evaluationCriteria?: string[];
  skillsAssessment?: Record<string, number>;
  isHighPriority?: boolean;
  requiresSpecialReview?: boolean;
}

export interface UpdateContributorRequestPriorityDto {
  priority: ContributorRequestPriority;
  reason?: string;
}

export interface BulkActionDto {
  requestIds: string[];
  action: ContributorRequestStatus;
  notes?: string;
}

// Utilitaires pour le frontend
export class ContributorRequestHelper {
  static getStatusColor(status: ContributorRequestStatus): string {
    switch (status) {
      case ContributorRequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ContributorRequestStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200';
      case ContributorRequestStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200';
      case ContributorRequestStatus.UNDER_REVIEW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  static getStatusIcon(status: ContributorRequestStatus): string {
    switch (status) {
      case ContributorRequestStatus.PENDING:
        return '⏳';
      case ContributorRequestStatus.APPROVED:
        return '✅';
      case ContributorRequestStatus.REJECTED:
        return '❌';
      case ContributorRequestStatus.UNDER_REVIEW:
        return '🔍';
      default:
        return '❓';
    }
  }

  static getPriorityColor(priority: ContributorRequestPriority): string {
    switch (priority) {
      case ContributorRequestPriority.LOW:
        return 'bg-gray-100 text-gray-700';
      case ContributorRequestPriority.MEDIUM:
        return 'bg-blue-100 text-blue-700';
      case ContributorRequestPriority.HIGH:
        return 'bg-orange-100 text-orange-700';
      case ContributorRequestPriority.URGENT:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  static getPriorityIcon(priority: ContributorRequestPriority): string {
    switch (priority) {
      case ContributorRequestPriority.LOW:
        return '🔵';
      case ContributorRequestPriority.MEDIUM:
        return '🟡';
      case ContributorRequestPriority.HIGH:
        return '🟠';
      case ContributorRequestPriority.URGENT:
        return '🔴';
      default:
        return '⚪';
    }
  }

  static getStatusLabel(status: ContributorRequestStatus): string {
    switch (status) {
      case ContributorRequestStatus.PENDING:
        return 'En attente';
      case ContributorRequestStatus.APPROVED:
        return 'Approuvée';
      case ContributorRequestStatus.REJECTED:
        return 'Rejetée';
      case ContributorRequestStatus.UNDER_REVIEW:
        return 'En révision';
      default:
        return 'Inconnu';
    }
  }

  static getPriorityLabel(priority: ContributorRequestPriority): string {
    switch (priority) {
      case ContributorRequestPriority.LOW:
        return 'Faible';
      case ContributorRequestPriority.MEDIUM:
        return 'Moyenne';
      case ContributorRequestPriority.HIGH:
        return 'Élevée';
      case ContributorRequestPriority.URGENT:
        return 'Urgente';
      default:
        return 'Inconnue';
    }
  }

  static getDaysOld(createdAt: Date): number {
    const now = new Date();
    const created = new Date(createdAt);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  static isExpiringSoon(expiresAt?: Date, days: number = 7): boolean {
    if (!expiresAt) return false;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  }

  static isExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  }

  static formatMotivation(motivation: string, maxLength: number = 100): string {
    if (motivation.length <= maxLength) return motivation;
    return motivation.substring(0, maxLength) + '...';
  }

  static getEvaluationGrade(score?: number): string {
    if (!score) return 'Non évalué';
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Très bien';
    if (score >= 70) return 'Bien';
    if (score >= 60) return 'Satisfaisant';
    return 'Insuffisant';
  }

  static getEvaluationGradeColor(score?: number): string {
    if (!score) return 'bg-gray-100 text-gray-700';
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }
}