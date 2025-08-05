import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ComprehensiveAdminService } from '../services/comprehensive-admin.service';
import { UserRole } from '../../../core/models/admin';

/**
 * Guard pour contrôler l'accès aux routes admin basé sur les rôles
 */
@Injectable({
  providedIn: 'root'
})
export class AdminRoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private adminService: ComprehensiveAdminService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const requiredRole = route.data['role'] as UserRole;
    const requiredPermission = route.data['permission'] as string;

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/auth/login']);
          return false;
        }

        const userRole = user.role as UserRole;

        // Vérifier le rôle minimum requis
        if (requiredRole && !this.adminService.hasMinimumRole(requiredRole, userRole)) {
          this.router.navigate(['/unauthorized']);
          return false;
        }

        // Si pas de permission spécifique requise, autoriser l'accès
        if (!requiredPermission) {
          return true;
        }

        // Pour les permissions spécifiques, on devrait idéalement vérifier
        // avec le service des permissions, mais pour simplifier ici
        // nous utilisons une logique basée sur les rôles
        return this.hasPermissionByRole(userRole, requiredPermission);
      })
    );
  }

  private hasPermissionByRole(userRole: UserRole, permission: string): boolean {
    const rolePermissions: Record<UserRole, string[]> = {
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

    return rolePermissions[userRole]?.includes(permission) || false;
  }
}