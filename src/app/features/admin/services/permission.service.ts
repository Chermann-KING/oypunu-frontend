import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/admin';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  // Hiérarchie des rôles pour comparaisons
  private readonly roleHierarchy = {
    [UserRole.USER]: 0,
    [UserRole.CONTRIBUTOR]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.SUPERADMIN]: 3,
  };

  constructor(private authService: AuthService) {}

  /**
   * Vérifie si l'utilisateur actuel a au moins un rôle minimum
   */
  hasMinimumRole(minimumRole: UserRole): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user) return false;
        const userRole = (user.role as UserRole) || UserRole.USER;
        return this.roleHierarchy[userRole] >= this.roleHierarchy[minimumRole];
      })
    );
  }

  /**
   * Vérifie si l'utilisateur actuel a exactement un des rôles spécifiés
   */
  hasAnyRole(roles: UserRole[]): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user) return false;
        const userRole = (user.role as UserRole) || UserRole.USER;
        return roles.includes(userRole);
      })
    );
  }

  /**
   * Vérifie si l'utilisateur actuel a exactement le rôle spécifié
   */
  hasExactRole(role: UserRole): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user) return false;
        const userRole = (user.role as UserRole) || UserRole.USER;
        return userRole === role;
      })
    );
  }

  /**
   * Retourne le rôle actuel de l'utilisateur
   */
  getCurrentRole(): Observable<UserRole> {
    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user) return UserRole.USER;
        return (user.role as UserRole) || UserRole.USER;
      })
    );
  }

  /**
   * Vérifie les permissions pour des sections spécifiques
   */
  canAccessDashboard(): Observable<boolean> {
    return this.hasMinimumRole(UserRole.CONTRIBUTOR);
  }

  canAccessUserManagement(): Observable<boolean> {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPERADMIN]);
  }

  canAccessModeration(): Observable<boolean> {
    return this.hasMinimumRole(UserRole.CONTRIBUTOR);
  }

  canAccessCommunityManagement(): Observable<boolean> {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPERADMIN]);
  }

  canAccessReports(): Observable<boolean> {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPERADMIN]);
  }

  canAccessSystemSettings(): Observable<boolean> {
    return this.hasExactRole(UserRole.SUPERADMIN);
  }

  canAccessActivityLogs(): Observable<boolean> {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPERADMIN]);
  }

  /**
   * Vérifie les permissions pour les actions sur les utilisateurs
   */
  canSuspendUsers(): Observable<boolean> {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPERADMIN]);
  }

  canChangeUserRoles(): Observable<boolean> {
    return this.hasExactRole(UserRole.SUPERADMIN);
  }

  canDeleteCommunities(): Observable<boolean> {
    return this.hasAnyRole([UserRole.ADMIN, UserRole.SUPERADMIN]);
  }

  canModerateWords(): Observable<boolean> {
    return this.hasMinimumRole(UserRole.CONTRIBUTOR);
  }

  canViewSystemMetrics(): Observable<boolean> {
    return this.hasExactRole(UserRole.SUPERADMIN);
  }

  /**
   * Méthodes synchrones pour les cas où on a déjà le rôle
   */
  hasMinimumRoleSync(userRole: UserRole, minimumRole: UserRole): boolean {
    return this.roleHierarchy[userRole] >= this.roleHierarchy[minimumRole];
  }

  hasAnyRoleSync(userRole: UserRole, roles: UserRole[]): boolean {
    return roles.includes(userRole);
  }

  hasExactRoleSync(userRole: UserRole, targetRole: UserRole): boolean {
    return userRole === targetRole;
  }

  /**
   * Retourne la liste des permissions d'un rôle
   */
  getPermissionsForRole(role: UserRole): string[] {
    const permissions = {
      [UserRole.USER]: [
        'view_own_profile',
        'edit_own_profile',
        'join_communities',
        'create_posts',
      ],
      [UserRole.CONTRIBUTOR]: [
        'view_own_profile',
        'edit_own_profile',
        'join_communities',
        'create_posts',
        'access_admin_dashboard',
        'moderate_words',
        'view_moderation_stats',
      ],
      [UserRole.ADMIN]: [
        'view_own_profile',
        'edit_own_profile',
        'join_communities',
        'create_posts',
        'access_admin_dashboard',
        'moderate_words',
        'view_moderation_stats',
        'manage_users',
        'suspend_users',
        'manage_communities',
        'delete_communities',
        'view_reports',
        'view_activity_logs',
      ],
      [UserRole.SUPERADMIN]: [
        'view_own_profile',
        'edit_own_profile',
        'join_communities',
        'create_posts',
        'access_admin_dashboard',
        'moderate_words',
        'view_moderation_stats',
        'manage_users',
        'suspend_users',
        'change_user_roles',
        'manage_communities',
        'delete_communities',
        'view_reports',
        'view_activity_logs',
        'access_system_settings',
        'view_system_metrics',
        'manage_global_settings',
      ],
    };

    return permissions[role] || [];
  }

  /**
   * Vérifie si un rôle a une permission spécifique
   */
  roleHasPermission(role: UserRole, permission: string): boolean {
    const rolePermissions = this.getPermissionsForRole(role);
    return rolePermissions.includes(permission);
  }

  /**
   * Retourne le nom d'affichage d'un rôle
   */
  getRoleDisplayName(role: UserRole): string {
    const roleNames = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super Administrateur',
    };
    return roleNames[role] || 'Inconnu';
  }

  /**
   * Retourne la description d'un rôle
   */
  getRoleDescription(role: UserRole): string {
    const descriptions = {
      [UserRole.USER]:
        'Utilisateur standard avec accès aux fonctionnalités de base',
      [UserRole.CONTRIBUTOR]:
        'Peut modérer les mots et accéder au tableau de bord admin',
      [UserRole.ADMIN]:
        'Peut gérer les utilisateurs, communautés et voir les rapports',
      [UserRole.SUPERADMIN]:
        'Accès complet à toutes les fonctionnalités administratives',
    };
    return descriptions[role] || 'Rôle inconnu';
  }
}
