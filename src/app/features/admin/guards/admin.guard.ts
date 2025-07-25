import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/admin';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate, CanActivateChild {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAdminAccess(route, state);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAdminAccess(childRoute, state);
  }

  private checkAdminAccess(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🔒 AdminGuard: Vérification des accès administrateur');
    console.log('📍 AdminGuard: Route demandée:', state.url);

    // Vérifier l'authentification
    if (!this.authService.isAuthenticated()) {
      console.log('❌ AdminGuard: Utilisateur non authentifié');
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
      return new Observable((observer) => observer.next(false));
    }

    return this.authService.currentUser$.pipe(
      map((user) => {
        if (!user) {
          console.log('❌ AdminGuard: Aucun utilisateur trouvé');
          this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: state.url },
          });
          return false;
        }

        const userRole = (user.role as UserRole) || UserRole.USER;
        console.log('👤 AdminGuard: Rôle utilisateur:', userRole);

        // Vérifier si l'utilisateur a au minimum le rôle de contributeur
        const hasAdminAccess = this.hasMinimumAdminRole(userRole);

        if (!hasAdminAccess) {
          console.log('🚫 AdminGuard: Accès refusé - Rôle insuffisant');
          this.redirectBasedOnRole(userRole, state.url);
          return false;
        }

        // Vérifications spécifiques par route
        if (!this.checkSpecificRoutePermissions(route, userRole)) {
          console.log(
            '🚫 AdminGuard: Accès refusé - Permissions spécifiques insuffisantes'
          );
          this.redirectToAuthorizedSection(userRole);
          return false;
        }

        console.log('✅ AdminGuard: Accès autorisé');
        return true;
      })
    );
  }

  /**
   * Vérifie si l'utilisateur a un rôle administratif minimum
   */
  private hasMinimumAdminRole(userRole: UserRole): boolean {
    const adminRoles = [
      UserRole.CONTRIBUTOR,
      UserRole.ADMIN,
      UserRole.SUPERADMIN,
    ];
    return adminRoles.includes(userRole);
  }

  /**
   * Vérifie les permissions spécifiques selon la route
   */
  private checkSpecificRoutePermissions(
    route: ActivatedRouteSnapshot,
    userRole: UserRole
  ): boolean {
    const routePath = route.routeConfig?.path || '';
    console.log('🛣️ AdminGuard: Vérification des permissions pour:', routePath);

    switch (routePath) {
      case 'dashboard':
        // Dashboard accessible à tous les rôles admin
        return this.hasMinimumAdminRole(userRole);

      case 'users':
      case 'user-management':
        // Gestion des utilisateurs : Admin et SuperAdmin uniquement
        return userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

      case 'communities':
        // Gestion des communautés : Admin et SuperAdmin
        return userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

      case 'words':
      case 'moderation':
        // Modération des mots : Contributeur et plus
        return this.hasMinimumAdminRole(userRole);

      case 'settings':
      case 'system':
        // Paramètres système : SuperAdmin uniquement
        return userRole === UserRole.SUPERADMIN;

      case 'reports':
        // Rapports : Admin et SuperAdmin
        return userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

      case 'activity':
      case 'logs':
        // Logs d'activité : Admin et SuperAdmin
        return userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

      default:
        // Par défaut, permettre l'accès si l'utilisateur a un rôle admin
        return this.hasMinimumAdminRole(userRole);
    }
  }

  /**
   * Redirection intelligente basée sur le rôle
   */
  private redirectBasedOnRole(userRole: UserRole, attemptedUrl: string): void {
    const redirections = {
      [UserRole.USER]: {
        url: '/home',
        message: 'Cette section est réservée aux administrateurs.',
      },
      [UserRole.CONTRIBUTOR]: {
        url: '/admin/dashboard',
        message: 'Redirection vers votre tableau de bord.',
      },
      [UserRole.ADMIN]: {
        url: '/admin/dashboard',
        message: 'Redirection vers votre tableau de bord.',
      },
      [UserRole.SUPERADMIN]: {
        url: '/admin/dashboard',
        message: 'Redirection vers votre tableau de bord.',
      },
    };

    const redirect = redirections[userRole];
    this.router.navigate([redirect.url], {
      queryParams: {
        error: 'access_denied',
        message: redirect.message,
        attempted: attemptedUrl,
      },
    });
  }

  /**
   * Redirige vers une section autorisée selon le rôle
   */
  private redirectToAuthorizedSection(userRole: UserRole): void {
    switch (userRole) {
      case UserRole.CONTRIBUTOR:
        this.router.navigate(['/admin/dashboard'], {
          queryParams: {
            error: 'insufficient_permissions',
            message:
              "Cette section nécessite des permissions d'administrateur.",
          },
        });
        break;

      case UserRole.ADMIN:
        this.router.navigate(['/admin/dashboard'], {
          queryParams: {
            error: 'superadmin_required',
            message: 'Cette section est réservée aux super-administrateurs.',
          },
        });
        break;

      default:
        this.router.navigate(['/admin/dashboard'], {
          queryParams: {
            error: 'access_denied',
            message: 'Permissions insuffisantes.',
          },
        });
    }
  }

  /**
   * Méthode utilitaire publique pour vérifier les permissions depuis les composants
   */
  canAccessSection(section: string, userRole: UserRole): boolean {
    const mockRoute = {
      routeConfig: { path: section },
    } as ActivatedRouteSnapshot;
    return this.checkSpecificRoutePermissions(mockRoute, userRole);
  }
}
