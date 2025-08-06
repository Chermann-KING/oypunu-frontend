/**
 * @fileoverview Guard de permissions granulaires pour le module Admin
 * 
 * Guard Angular qui vérifie les permissions spécifiques avant d'autoriser
 * l'accès aux routes. Respecte les principes SOLID et l'Interface Segregation.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { PermissionService } from '../services/permission.service';
import { Permission, PermissionContext } from '../models/permissions.models';
import { UserRole } from '../models/admin.models';

/**
 * Données de permission extraites de la route
 */
interface RoutePermissionData {
  readonly permission?: Permission | Permission[];
  readonly role?: UserRole | UserRole[];
  readonly context?: PermissionContext;
  readonly contextId?: string;
  readonly requireAll?: boolean; // Si true, toutes les permissions sont requises
}

/**
 * Guard de permissions - Open/Closed Principle
 * 
 * Ce guard est extensible sans modification grâce à l'injection de dépendances
 * et à la configuration via les données de route.
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate, CanActivateChild {

  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
    private readonly router: Router
  ) {}

  /**
   * Vérifie les permissions pour l'activation d'une route
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkPermissions(route, state);
  }

  /**
   * Vérifie les permissions pour l'activation des routes enfants
   */
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkPermissions(childRoute, state);
  }

  /**
   * Logique principale de vérification des permissions
   * Respecte le Single Responsibility Principle
   */
  private checkPermissions(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Récupérer les données de permission de la route
    const permissionData = this.extractPermissionData(route);
    
    // Si aucune permission spécifiée, autoriser l'accès
    if (!this.hasPermissionRequirements(permissionData)) {
      return of(true);
    }

    // Vérifier l'authentification
    if (!this.authService.isAuthenticated()) {
      this.handleUnauthenticated(state.url);
      return of(false);
    }

    // Vérifier les permissions
    return this.validatePermissions(permissionData, route, state);
  }

  /**
   * Extrait les données de permission de la route et de ses parents
   * Respecte le principe DRY
   */
  private extractPermissionData(route: ActivatedRouteSnapshot): RoutePermissionData {
    let permissionData: RoutePermissionData = {};

    // Parcourir la hiérarchie des routes pour collecter les permissions
    let currentRoute: ActivatedRouteSnapshot | null = route;
    while (currentRoute) {
      const routeData = currentRoute.data;
      
      // Fusionner les données de permission (les plus spécifiques l'emportent)
      permissionData = {
        ...permissionData,
        ...this.extractRoutePermissionData(routeData)
      };

      currentRoute = currentRoute.parent;
    }

    return permissionData;
  }

  /**
   * Extrait les données de permission d'un objet de données de route
   */
  private extractRoutePermissionData(routeData: any): RoutePermissionData {
    return {
      permission: routeData.permission || routeData.permissions,
      role: routeData.role || routeData.roles,
      context: routeData.context,
      contextId: routeData.contextId,
      requireAll: routeData.requireAll || false
    };
  }

  /**
   * Vérifie si la route a des exigences de permission
   */
  private hasPermissionRequirements(permissionData: RoutePermissionData): boolean {
    return !!(permissionData.permission || permissionData.role);
  }

  /**
   * Valide les permissions selon les données extraites
   */
  private validatePermissions(
    permissionData: RoutePermissionData,
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.handleUnauthenticated(state.url);
      return of(false);
    }

    // Vérifier les rôles si spécifiés
    if (permissionData.role && !this.checkRoles(permissionData.role, currentUser.role as UserRole)) {
      this.handleInsufficientPermissions(state.url);
      return of(false);
    }

    // Vérifier les permissions si spécifiées
    if (permissionData.permission) {
      return this.checkSpecificPermissions(
        permissionData.permission,
        permissionData.context,
        permissionData.contextId,
        permissionData.requireAll || false
      ).pipe(
        map(hasPermission => {
          if (!hasPermission) {
            this.handleInsufficientPermissions(state.url);
          }
          return hasPermission;
        }),
        catchError(() => {
          this.handlePermissionCheckError(state.url);
          return of(false);
        })
      );
    }

    return of(true);
  }

  /**
   * Vérifie si l'utilisateur a le(s) rôle(s) requis
   */
  private checkRoles(requiredRoles: UserRole | UserRole[], userRole: UserRole): boolean {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(userRole) || this.hasHigherRole(userRole, roles);
  }

  /**
   * Vérifie si l'utilisateur a un rôle supérieur aux rôles requis
   */
  private hasHigherRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.USER]: 1,
      [UserRole.CONTRIBUTOR]: 2,
      [UserRole.ADMIN]: 3,
      [UserRole.SUPERADMIN]: 4
    };

    const userLevel = roleHierarchy[userRole];
    const maxRequiredLevel = Math.max(...requiredRoles.map(role => roleHierarchy[role]));
    
    return userLevel >= maxRequiredLevel;
  }

  /**
   * Vérifie les permissions spécifiques
   */
  private checkSpecificPermissions(
    requiredPermissions: Permission | Permission[],
    context?: PermissionContext,
    contextId?: string,
    requireAll: boolean = false
  ): Observable<boolean> {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Créer un tableau d'observables pour chaque vérification de permission
    const permissionChecks = permissions.map(permission => 
      this.permissionService.hasPermission(permission, context, contextId)
    );

    // Utiliser l'opérateur approprié selon requireAll
    if (requireAll) {
      // Toutes les permissions doivent être accordées
      return this.permissionService.hasAllPermissions(permissions, context, contextId);
    } else {
      // Au moins une permission doit être accordée
      return this.permissionService.hasAnyPermission(permissions, context, contextId);
    }
  }

  /**
   * Gère le cas d'un utilisateur non authentifié
   */
  private handleUnauthenticated(attemptedUrl: string): void {
    console.warn('[PermissionGuard] Accès refusé: utilisateur non authentifié');
    
    // Stocker l'URL tentée pour redirection après connexion
    try {
      // Vérifier si la méthode existe avant de l'utiliser
      if (typeof (this.authService as any).setRedirectUrl === 'function') {
        (this.authService as any).setRedirectUrl(attemptedUrl);
      } else {
        // Fallback: stocker dans sessionStorage
        sessionStorage.setItem('adminRedirectUrl', attemptedUrl);
      }
    } catch {
      // Fallback: stocker dans sessionStorage
      sessionStorage.setItem('adminRedirectUrl', attemptedUrl);
    }
    
    // Rediriger vers la page de connexion
    this.router.navigate(['/auth/login'], {
      queryParams: {
        returnUrl: attemptedUrl,
        reason: 'authentication_required'
      }
    });
  }

  /**
   * Gère le cas de permissions insuffisantes
   */
  private handleInsufficientPermissions(attemptedUrl: string): void {
    console.warn('[PermissionGuard] Accès refusé: permissions insuffisantes');
    
    // Rediriger vers une page d'erreur appropriée
    this.router.navigate(['/unauthorized'], {
      queryParams: {
        attempted: attemptedUrl,
        reason: 'insufficient_permissions'
      }
    });
  }

  /**
   * Gère les erreurs lors de la vérification des permissions
   */
  private handlePermissionCheckError(attemptedUrl: string): void {
    console.error('[PermissionGuard] Erreur lors de la vérification des permissions');
    
    // Rediriger vers une page d'erreur générique
    this.router.navigate(['/error'], {
      queryParams: {
        attempted: attemptedUrl,
        reason: 'permission_check_error'
      }
    });
  }

  /**
   * Méthode utilitaire pour débugger les permissions
   * Peut être activée en mode développement
   */
  private debugPermissions(
    permissionData: RoutePermissionData,
    route: ActivatedRouteSnapshot
  ): void {
    // Debug désactivé temporairement
    // console.group('[PermissionGuard] Debug Info');
    // console.log('Route:', route.routeConfig?.path);
    // console.log('Permission Data:', permissionData);
    // console.log('Current User:', this.authService.getCurrentUser());
    // console.groupEnd();
  }
}

/**
 * Factory function pour créer des guards de permission spécialisés
 * Respecte le Factory Pattern et le principe d'extensibilité
 */
export function createPermissionGuard(defaultPermissions: Permission[]): any {
  return class extends PermissionGuard {
    override canActivate(
      route: ActivatedRouteSnapshot,
      state: RouterStateSnapshot
    ): Observable<boolean> | Promise<boolean> | boolean {
      // Ajouter les permissions par défaut si aucune n'est spécifiée
      if (!route.data['permission'] && !route.data['permissions']) {
        route.data['permissions'] = defaultPermissions;
      }
      
      return super.canActivate(route, state);
    }
  };
}

/**
 * Guards pré-configurés pour des cas d'usage courants
 */
export const AdminOnlyGuard = createPermissionGuard([Permission.VIEW_ANALYTICS]);
export const SuperAdminOnlyGuard = createPermissionGuard([Permission.MANAGE_SYSTEM]);
export const ModeratorGuard = createPermissionGuard([Permission.MODERATE_CONTENT]);