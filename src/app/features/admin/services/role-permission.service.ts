import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ComprehensiveAdminService } from './comprehensive-admin.service';
import { AdminPermissions } from '../models/comprehensive-admin.models';
import { UserRole } from '../../../core/models/admin';

/**
 * Service centralisé pour la gestion des rôles et permissions
 */
@Injectable({
  providedIn: 'root'
})
export class RolePermissionService {

  constructor(
    private authService: AuthService,
    private adminService: ComprehensiveAdminService
  ) {}

  /**
   * Vérifie si l'utilisateur actuel a une permission spécifique
   */
  hasPermission(permission: keyof AdminPermissions): Observable<boolean> {
    return combineLatest([
      this.authService.currentUser$,
      this.adminService.userPermissions$
    ]).pipe(
      map(([user, permissions]) => {
        if (!user) return false;

        // Si les permissions sont disponibles, les utiliser
        if (permissions) {
          return permissions[permission] || false;
        }

        // Sinon, fallback sur les permissions basées sur les rôles
        const userRole = user.role as UserRole;
        return this.hasPermissionByRole(userRole, permission as string);
      })
    );
  }

  /**
   * Vérifie si l'utilisateur actuel a plusieurs permissions
   */
  hasPermissions(permissions: (keyof AdminPermissions)[], requireAll: boolean = false): Observable<boolean> {
    const permissionChecks = permissions.map(permission => this.hasPermission(permission));
    
    return combineLatest(permissionChecks).pipe(
      map(results => {
        return requireAll ? results.every(result => result) : results.some(result => result);
      })
    );
  }

  /**
   * Vérifie si l'utilisateur actuel a le rôle minimum requis
   */
  hasMinimumRole(requiredRole: UserRole): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        const userRole = user.role as UserRole;
        return this.adminService.hasMinimumRole(requiredRole, userRole);
      })
    );
  }

  /**
   * Vérifie si l'utilisateur actuel a exactement le rôle spécifié
   */
  hasExactRole(role: UserRole): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        return user.role === role;
      })
    );
  }

  /**
   * Récupère le rôle de l'utilisateur actuel
   */
  getCurrentUserRole(): Observable<UserRole | null> {
    return this.authService.currentUser$.pipe(
      map(user => user ? user.role as UserRole : null)
    );
  }

  /**
   * Récupère les permissions de l'utilisateur actuel
   */
  getCurrentUserPermissions(): Observable<AdminPermissions | null> {
    return this.adminService.userPermissions$;
  }

  /**
   * Vérifie les permissions basées sur les rôles (fallback)
   */
  private hasPermissionByRole(userRole: UserRole, permission: string): boolean {
    const rolePermissions = this.getRolePermissions();
    return rolePermissions[userRole]?.includes(permission) || false;
  }

  /**
   * Récupère la configuration des permissions par rôle
   */
  getRolePermissions(): Record<UserRole, string[]> {
    return {
      [UserRole.USER]: [],
      [UserRole.CONTRIBUTOR]: [
        'canModerateContent',
        'canViewAnalytics'
      ],
      [UserRole.ADMIN]: [
        'canViewUsers',
        'canEditUsers',
        'canSuspendUsers',
        'canModerateContent',
        'canManageCommunities',
        'canViewAnalytics',
        'canManageLanguages',
        'canExportData'
      ],
      [UserRole.SUPERADMIN]: [
        'canViewUsers',
        'canEditUsers',
        'canSuspendUsers',
        'canChangeUserRoles',
        'canModerateContent',
        'canManageCommunities',
        'canViewAnalytics',
        'canViewSystemMetrics',
        'canExportData',
        'canManageLanguages',
        'canViewLogs',
        'canManageSystem'
      ]
    };
  }

  /**
   * Récupère la hiérarchie des rôles
   */
  getRoleHierarchy(): Record<UserRole, number> {
    return {
      [UserRole.USER]: 0,
      [UserRole.CONTRIBUTOR]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPERADMIN]: 3
    };
  }

  /**
   * Récupère les noms d'affichage des rôles
   */
  getRoleDisplayNames(): Record<UserRole, string> {
    return {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super Administrateur'
    };
  }

  /**
   * Récupère les descriptions des rôles
   */
  getRoleDescriptions(): Record<UserRole, string> {
    return {
      [UserRole.USER]: 'Accès basique à la plateforme',
      [UserRole.CONTRIBUTOR]: 'Peut modérer le contenu et voir les analytics',
      [UserRole.ADMIN]: 'Gestion complète des utilisateurs et contenus',
      [UserRole.SUPERADMIN]: 'Accès total au système et configurations'
    };
  }

  /**
   * Récupère les permissions disponibles pour un rôle donné
   */
  getPermissionsForRole(role: UserRole): string[] {
    const rolePermissions = this.getRolePermissions();
    return rolePermissions[role] || [];
  }

  /**
   * Vérifie si un rôle peut être assigné par l'utilisateur actuel
   */
  canAssignRole(targetRole: UserRole): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) return false;
        
        const userRole = user.role as UserRole;
        const hierarchy = this.getRoleHierarchy();
        
        // Un utilisateur ne peut assigner que des rôles inférieurs au sien
        // Et seul SUPERADMIN peut assigner ADMIN
        if (targetRole === UserRole.SUPERADMIN) {
          return userRole === UserRole.SUPERADMIN;
        }
        
        if (targetRole === UserRole.ADMIN) {
          return userRole === UserRole.SUPERADMIN;
        }
        
        return hierarchy[userRole] > hierarchy[targetRole];
      })
    );
  }
}