export enum UserRole {
  USER = 'user',
  CONTRIBUTOR = 'contributor',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalWords: number;
  pendingWords: number;
  approvedWords: number;
  rejectedWords: number;
  totalCommunities: number;
  activeCommunities: number;
  totalPosts: number;
  totalMessages: number;
  newUsersThisMonth: number;
  newWordsThisWeek: number;
}

export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isSuspended: boolean;
  suspendedUntil?: Date;
  suspensionReason?: string;
  notes?: string;
  lastLogin?: Date;
  lastActive: Date;
  createdAt: Date;
  totalWordsAdded: number;
  totalCommunityPosts: number;
}

export interface UserManagementData {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PendingWord {
  _id: string;
  word: string;
  language: string;
  pronunciation?: string;
  meanings: any[];
  status: string;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: Date;
}

export interface PendingWordsData {
  words: PendingWord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminCommunity {
  _id: string;
  name: string;
  language: string;
  description?: string;
  memberCount: number;
  isPrivate: boolean;
  createdBy: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: Date;
}

export interface CommunitiesData {
  communities: AdminCommunity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecentActivity {
  recentUsers: any[];
  recentWords: any[];
  recentCommunities: any[];
}

export interface ContributorDashboard {
  pendingWords: number;
  approvedWords: number;
  rejectedWords: number;
  newWordsThisWeek: number;
}

export interface AdminDashboard {
  stats: AdminStats;
  recentActivity: RecentActivity;
}

export interface SuperAdminDashboard {
  stats: AdminStats;
  recentActivity: RecentActivity;
  systemHealth: {
    uptime: number;
    memory: any;
    nodeVersion: string;
  };
}
