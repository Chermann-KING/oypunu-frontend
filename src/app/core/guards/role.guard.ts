import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/admin';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  // Hiérarchie des rôles (plus le nombre est élevé, plus le pouvoir est grand)
  private readonly roleHierarchy = {
    [UserRole.USER]: 0,
    [UserRole.CONTRIBUTOR]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.SUPERADMIN]: 3,
  };

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    console.log('🔐 RoleGuard: Vérification des permissions');

    // Vérifier d'abord si l'utilisateur est authentifié
    if (!this.authService.isAuthenticated()) {
      console.log('❌ RoleGuard: Utilisateur non authentifié');
      this.router.navigate(['/auth/login']);
      return of(false);
    }

    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user) {
          console.log('❌ RoleGuard: Aucun utilisateur trouvé');
          this.router.navigate(['/auth/login']);
          return false;
        }

        const userRole = (user.role as UserRole) || UserRole.USER;
        console.log('👤 RoleGuard: Rôle utilisateur:', userRole);

        // Récupérer les rôles requis depuis les données de la route
        const requiredRoles = route.data['roles'] as UserRole[] | undefined;
        const minRole = route.data['minRole'] as UserRole | undefined;

        // Si aucune restriction de rôle n'est définie, autoriser l'accès
        if (!requiredRoles && !minRole) {
          console.log(
            '✅ RoleGuard: Aucune restriction de rôle, accès autorisé'
          );
          return true;
        }

        // Vérification par rôles spécifiques
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.includes(userRole);
          console.log('🎯 RoleGuard: Rôles requis:', requiredRoles);
          console.log(
            '📋 RoleGuard: Utilisateur a un rôle requis:',
            hasRequiredRole
          );

          if (!hasRequiredRole) {
            this.handleUnauthorizedAccess(userRole);
            return false;
          }
        }

        // Vérification par niveau minimum de rôle
        if (minRole) {
          const userLevel = this.roleHierarchy[userRole];
          const requiredLevel = this.roleHierarchy[minRole];
          const hasMinimumLevel = userLevel >= requiredLevel;

          console.log(
            '📊 RoleGuard: Niveau minimum requis:',
            minRole,
            `(${requiredLevel})`
          );
          console.log(
            '📊 RoleGuard: Niveau utilisateur:',
            userRole,
            `(${userLevel})`
          );
          console.log('🎚️ RoleGuard: Niveau suffisant:', hasMinimumLevel);

          if (!hasMinimumLevel) {
            this.handleUnauthorizedAccess(userRole);
            return false;
          }
        }

        console.log('✅ RoleGuard: Accès autorisé');
        return true;
      })
    );
  }

  /**
   * Gère les accès non autorisés avec redirection intelligente
   */
  private handleUnauthorizedAccess(userRole: UserRole): void {
    console.log('🚫 RoleGuard: Accès refusé pour le rôle:', userRole);

    // Redirection intelligente selon le rôle de l'utilisateur
    switch (userRole) {
      case UserRole.USER:
        // Utilisateur normal : rediriger vers la page d'accueil
        this.router.navigate(['/home'], {
          queryParams: {
            error: 'access_denied',
            message:
              "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
          },
        });
        break;

      case UserRole.CONTRIBUTOR:
        // Contributeur : rediriger vers le dashboard contributeur s'il existe
        this.router.navigate(['/admin/dashboard'], {
          queryParams: {
            error: 'insufficient_permissions',
            message: 'Permissions insuffisantes pour cette section.',
          },
        });
        break;

      case UserRole.ADMIN:
        // Admin : rediriger vers le dashboard admin
        this.router.navigate(['/admin/dashboard'], {
          queryParams: {
            error: 'superadmin_required',
            message: 'Cette section est réservée aux super-administrateurs.',
          },
        });
        break;

      default:
        // Cas par défaut
        this.router.navigate(['/home'], {
          queryParams: {
            error: 'access_denied',
            message: 'Accès non autorisé.',
          },
        });
    }
  }

  /**
   * Méthode utilitaire pour vérifier si un utilisateur a un rôle spécifique
   */
  hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return this.roleHierarchy[userRole] >= this.roleHierarchy[requiredRole];
  }

  /**
   * Méthode utilitaire pour vérifier si un utilisateur a au moins un des rôles requis
   */
  hasAnyRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }
}
