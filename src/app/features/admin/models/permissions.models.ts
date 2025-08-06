/**
 * @fileoverview Modèles TypeScript pour le système de permissions
 * 
 * Définit toutes les interfaces et types nécessaires pour le système
 * d'autorisation granulaire du module admin, respectant les principes SOLID.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { UserRole } from './admin.models';

// ===== ÉNUMÉRATIONS =====

/**
 * Permissions granulaires du système
 */
export enum Permission {
  // === PERMISSIONS UTILISATEURS ===
  VIEW_USERS = 'canViewUsers',
  EDIT_USERS = 'canEditUsers',
  SUSPEND_USERS = 'canSuspendUsers',
  DELETE_USERS = 'canDeleteUsers',
  CHANGE_USER_ROLES = 'canChangeUserRoles',
  VIEW_USER_DETAILS = 'canViewUserDetails',
  EXPORT_USER_DATA = 'canExportUserData',

  // === PERMISSIONS MODÉRATION ===
  MODERATE_CONTENT = 'canModerateContent',
  APPROVE_WORDS = 'canApproveWords',
  REJECT_WORDS = 'canRejectWords',
  VIEW_PENDING_WORDS = 'canViewPendingWords',
  MODERATE_REVISIONS = 'canModerateRevisions',
  VIEW_MODERATION_HISTORY = 'canViewModerationHistory',

  // === PERMISSIONS COMMUNAUTÉS ===
  MANAGE_COMMUNITIES = 'canManageCommunities',
  CREATE_COMMUNITIES = 'canCreateCommunities',
  DELETE_COMMUNITIES = 'canDeleteCommunities',
  VIEW_COMMUNITY_DETAILS = 'canViewCommunityDetails',
  MODERATE_COMMUNITY_CONTENT = 'canModerateCommunityContent',

  // === PERMISSIONS ANALYTICS ===
  VIEW_ANALYTICS = 'canViewAnalytics',
  VIEW_USER_ANALYTICS = 'canViewUserAnalytics',
  VIEW_CONTENT_ANALYTICS = 'canViewContentAnalytics',
  VIEW_COMMUNITY_ANALYTICS = 'canViewCommunityAnalytics',
  VIEW_SYSTEM_METRICS = 'canViewSystemMetrics',
  EXPORT_ANALYTICS = 'canExportAnalytics',

  // === PERMISSIONS SYSTÈME ===
  MANAGE_SYSTEM = 'canManageSystem',
  VIEW_SYSTEM_LOGS = 'canViewLogs',
  MANAGE_LANGUAGES = 'canManageLanguages',
  MANAGE_SETTINGS = 'canManageSettings',
  VIEW_AUDIT_LOGS = 'canViewAuditLogs',
  MANAGE_BACKUPS = 'canManageBackups',

  // === PERMISSIONS RAPPORTS ===
  GENERATE_REPORTS = 'canGenerateReports',
  EXPORT_DATA = 'canExportData',
  SCHEDULE_REPORTS = 'canScheduleReports',
  VIEW_SYSTEM_STATUS = 'canViewSystemStatus'
}

/**
 * Contexte d'application d'une permission
 */
export enum PermissionContext {
  GLOBAL = 'global',
  COMMUNITY = 'community',
  USER = 'user',
  CONTENT = 'content'
}

/**
 * Niveau de permission
 */
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

// ===== INTERFACES PERMISSIONS =====

/**
 * Définition d'une permission
 */
export interface PermissionDefinition {
  readonly id: Permission;
  readonly name: string;
  readonly description: string;
  readonly context: PermissionContext;
  readonly level: PermissionLevel;
  readonly requiredRole: UserRole;
  readonly dependencies?: Permission[];
}

/**
 * Set de permissions pour un rôle
 */
export interface RolePermissions {
  readonly role: UserRole;
  readonly permissions: Permission[];
  readonly inherit?: UserRole[];
}

/**
 * Permission avec contexte
 */
export interface ContextualPermission {
  readonly permission: Permission;
  readonly context: PermissionContext;
  readonly contextId?: string;
  readonly granted: boolean;
  readonly grantedAt?: Date;
  readonly grantedBy?: string;
}

/**
 * Profil de permissions utilisateur
 */
export interface UserPermissionProfile {
  readonly userId: string;
  readonly role: UserRole;
  readonly permissions: ContextualPermission[];
  readonly customPermissions?: Permission[];
  readonly deniedPermissions?: Permission[];
  readonly lastUpdated: Date;
}

/**
 * Vérification de permission
 */
export interface PermissionCheck {
  readonly permission: Permission;
  readonly context?: PermissionContext;
  readonly contextId?: string;
  readonly userId: string;
  readonly result: boolean;
  readonly reason?: string;
  readonly checkedAt: Date;
}

/**
 * Audit de permission
 */
export interface PermissionAudit {
  readonly id: string;
  readonly userId: string;
  readonly permission: Permission;
  readonly action: 'granted' | 'denied' | 'revoked';
  readonly context?: PermissionContext;
  readonly contextId?: string;
  readonly performedBy: string;
  readonly timestamp: Date;
  readonly reason?: string;
  readonly metadata?: Record<string, any>;
}

// ===== INTERFACES CONFIGURATION =====

/**
 * Configuration du système de permissions
 */
export interface PermissionSystemConfig {
  readonly strictMode: boolean;
  readonly inheritanceEnabled: boolean;
  readonly auditEnabled: boolean;
  readonly cacheEnabled: boolean;
  readonly cacheTTL: number;
  readonly defaultPermissions: Permission[];
}

/**
 * Règle de permission
 */
export interface PermissionRule {
  readonly id: string;
  readonly name: string;
  readonly condition: string;
  readonly effect: 'allow' | 'deny';
  readonly priority: number;
  readonly enabled: boolean;
}

/**
 * Politique de permission
 */
export interface PermissionPolicy {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rules: PermissionRule[];
  readonly applicableRoles: UserRole[];
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ===== INTERFACES UTILITAIRES =====

/**
 * Matrice de permissions pour affichage
 */
export interface PermissionMatrix {
  readonly roles: UserRole[];
  readonly permissions: Permission[];
  readonly matrix: boolean[][];
  readonly metadata: {
    readonly totalPermissions: number;
    readonly permissionsByRole: Record<UserRole, number>;
    readonly generatedAt: Date;
  };
}

/**
 * Groupe de permissions logiques
 */
export interface PermissionGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: Permission[];
  readonly icon?: string;
  readonly color?: string;
  readonly order: number;
}

/**
 * Template de rôle
 */
export interface RoleTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly baseRole: UserRole;
  readonly permissions: Permission[];
  readonly customizable: boolean;
}

/**
 * Requête de permission
 */
export interface PermissionRequest {
  readonly userId: string;
  readonly permission: Permission;
  readonly context?: PermissionContext;
  readonly contextId?: string;
  readonly reason?: string;
  readonly requestedBy: string;
  readonly requestedAt: Date;
  readonly expiresAt?: Date;
}

/**
 * Réponse de vérification de permissions
 */
export interface PermissionCheckResponse {
  readonly allowed: boolean;
  readonly permissions: {
    readonly [key in Permission]?: boolean;
  };
  readonly missingPermissions: Permission[];
  readonly context?: PermissionContext;
  readonly contextId?: string;
  readonly checkedAt: Date;
}

// ===== CONSTANTES ET MAPPINGS =====

/**
 * Mapping des permissions par rôle (configuration par défaut)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    // Aucune permission administrative
  ],
  
  [UserRole.CONTRIBUTOR]: [
    Permission.VIEW_PENDING_WORDS,
    Permission.APPROVE_WORDS,
    Permission.REJECT_WORDS,
    Permission.MODERATE_CONTENT,
    Permission.VIEW_MODERATION_HISTORY,
    Permission.MODERATE_REVISIONS
  ],
  
  [UserRole.ADMIN]: [
    // Hérite des permissions CONTRIBUTOR
    Permission.VIEW_USERS,
    Permission.EDIT_USERS,
    Permission.SUSPEND_USERS,
    Permission.VIEW_USER_DETAILS,
    Permission.MANAGE_COMMUNITIES,
    Permission.DELETE_COMMUNITIES,
    Permission.VIEW_COMMUNITY_DETAILS,
    Permission.MODERATE_COMMUNITY_CONTENT,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_USER_ANALYTICS,
    Permission.VIEW_CONTENT_ANALYTICS,
    Permission.VIEW_COMMUNITY_ANALYTICS,
    Permission.EXPORT_ANALYTICS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_SYSTEM_STATUS
  ],
  
  [UserRole.SUPERADMIN]: [
    // Toutes les permissions (hérite de ADMIN + permissions système)
    Permission.DELETE_USERS,
    Permission.CHANGE_USER_ROLES,
    Permission.EXPORT_USER_DATA,
    Permission.VIEW_SYSTEM_METRICS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_SYSTEM_LOGS,
    Permission.MANAGE_LANGUAGES,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_BACKUPS,
    Permission.SCHEDULE_REPORTS,
    Permission.CREATE_COMMUNITIES
  ]
};

/**
 * Groupes de permissions pour l'interface utilisateur
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'users',
    name: 'Gestion des utilisateurs',
    description: 'Permissions liées à la gestion des comptes utilisateur',
    permissions: [
      Permission.VIEW_USERS,
      Permission.EDIT_USERS,
      Permission.SUSPEND_USERS,
      Permission.DELETE_USERS,
      Permission.CHANGE_USER_ROLES,
      Permission.VIEW_USER_DETAILS,
      Permission.EXPORT_USER_DATA
    ],
    icon: 'users',
    color: '#3B82F6',
    order: 1
  },
  {
    id: 'moderation',
    name: 'Modération de contenu',
    description: 'Permissions liées à la modération et validation du contenu',
    permissions: [
      Permission.MODERATE_CONTENT,
      Permission.APPROVE_WORDS,
      Permission.REJECT_WORDS,
      Permission.VIEW_PENDING_WORDS,
      Permission.MODERATE_REVISIONS,
      Permission.VIEW_MODERATION_HISTORY
    ],
    icon: 'shield-check',
    color: '#10B981',
    order: 2
  },
  {
    id: 'communities',
    name: 'Gestion des communautés',
    description: 'Permissions liées à la gestion des communautés',
    permissions: [
      Permission.MANAGE_COMMUNITIES,
      Permission.CREATE_COMMUNITIES,
      Permission.DELETE_COMMUNITIES,
      Permission.VIEW_COMMUNITY_DETAILS,
      Permission.MODERATE_COMMUNITY_CONTENT
    ],
    icon: 'users-group',
    color: '#8B5CF6',
    order: 3
  },
  {
    id: 'analytics',
    name: 'Analytics et rapports',
    description: 'Permissions liées aux analytics et génération de rapports',
    permissions: [
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_USER_ANALYTICS,
      Permission.VIEW_CONTENT_ANALYTICS,
      Permission.VIEW_COMMUNITY_ANALYTICS,
      Permission.VIEW_SYSTEM_METRICS,
      Permission.EXPORT_ANALYTICS,
      Permission.GENERATE_REPORTS,
      Permission.EXPORT_DATA,
      Permission.SCHEDULE_REPORTS
    ],
    icon: 'chart-bar',
    color: '#F59E0B',
    order: 4
  },
  {
    id: 'system',
    name: 'Administration système',
    description: 'Permissions liées à l\'administration du système',
    permissions: [
      Permission.MANAGE_SYSTEM,
      Permission.VIEW_SYSTEM_LOGS,
      Permission.MANAGE_LANGUAGES,
      Permission.MANAGE_SETTINGS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.MANAGE_BACKUPS,
      Permission.VIEW_SYSTEM_STATUS
    ],
    icon: 'cog',
    color: '#EF4444',
    order: 5
  }
];

// ===== TYPES UTILITAIRES =====

/**
 * Type pour vérifier si un utilisateur a une permission
 */
export type HasPermission = (permission: Permission, context?: PermissionContext, contextId?: string) => boolean;

/**
 * Type pour vérifier si un utilisateur a un rôle
 */
export type HasRole = (role: UserRole | UserRole[]) => boolean;

/**
 * Type pour vérifier si un utilisateur a un niveau de permission minimum
 */
export type HasMinimumRole = (minimumRole: UserRole) => boolean;