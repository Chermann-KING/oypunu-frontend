/**
 * @fileoverview Service de gestion des permissions granulaires
 * 
 * Service central pour la vérification et la gestion des permissions.
 * Respecte les principes SOLID avec une interface claire et extensible.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { AdminApiService } from './admin-api.service';
import {
  Permission,
  PermissionContext,
  UserPermissionProfile,
  PermissionCheck,
  RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  ContextualPermission
} from '../models/permissions.models';
import { UserRole } from '../models/admin.models';

/**
 * Interface pour le cache des permissions
 */
interface PermissionCache {
  [key: string]: {
    result: boolean;
    timestamp: number;
    ttl: number;
  };
}

/**
 * Service de permissions - Single Responsibility Principle
 * 
 * Ce service gère uniquement les permissions et leur vérification.
 * Il est découplé de l'authentification via l'injection de dépendances.
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly permissionCache: PermissionCache = {};
  
  // State management pour les permissions
  private readonly userPermissionsSubject = new BehaviorSubject<UserPermissionProfile | null>(null);
  public readonly userPermissions$ = this.userPermissionsSubject.asObservable();

  constructor(
    private readonly authService: AuthService,
    private readonly adminApiService: AdminApiService
  ) {
    // S'abonner aux changements d'utilisateur pour mettre à jour les permissions
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserPermissions(user.id);
      } else {
        this.clearUserPermissions();
      }
    });

    // Démarrer le nettoyage automatique du cache
    this.startCacheCleanup();
  }

  // ===== MÉTHODES PRINCIPALES =====

  /**
   * Vérifie si l'utilisateur actuel a une permission spécifique
   * 
   * @param permission - Permission à vérifier
   * @param context - Contexte optionnel de la permission
   * @param contextId - ID du contexte optionnel
   * @returns Observable<boolean> - True si la permission est accordée
   */
  hasPermission(
    permission: Permission,
    context?: PermissionContext,
    contextId?: string
  ): Observable<boolean> {
    const cacheKey = this.buildCacheKey(permission, context, contextId);
    
    // Vérifier le cache en premier
    const cached = this.getCachedResult(cacheKey);
    if (cached !== null) {
      return of(cached);
    }

    return this.checkPermissionInternal(permission, context, contextId)
      .pipe(
        tap(result => this.cacheResult(cacheKey, result)),
        catchError(() => of(false))
      );
  }

  /**
   * Vérifie si l'utilisateur a TOUTES les permissions spécifiées
   */
  hasAllPermissions(
    permissions: Permission[],
    context?: PermissionContext,
    contextId?: string
  ): Observable<boolean> {
    const permissionChecks = permissions.map(permission => 
      this.hasPermission(permission, context, contextId)
    );

    return combineLatest([...permissionChecks]).pipe(
      map(results => results.every(result => result === true))
    );
  }

  /**
   * Vérifie si l'utilisateur a AU MOINS UNE des permissions spécifiées
   */
  hasAnyPermission(
    permissions: Permission[],
    context?: PermissionContext,
    contextId?: string
  ): Observable<boolean> {
    const permissionChecks = permissions.map(permission => 
      this.hasPermission(permission, context, contextId)
    );

    return combineLatest([...permissionChecks]).pipe(
      map(results => results.some(result => result === true))
    );
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique ou supérieur
   */
  hasRole(role: UserRole | UserRole[]): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(currentUser.role as UserRole) || this.hasHigherRole(currentUser.role as UserRole, roles);
  }

  /**
   * Vérifie si l'utilisateur a un niveau de rôle minimum
   */
  hasMinimumRole(minimumRole: UserRole): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;

    return this.getRoleLevel(currentUser.role as UserRole) >= this.getRoleLevel(minimumRole);
  }

  // ===== MÉTHODES DE GESTION DES PERMISSIONS =====

  /**
   * Récupère le profil de permissions de l'utilisateur actuel
   */
  getUserPermissionProfile(): Observable<UserPermissionProfile | null> {
    return this.userPermissions$;
  }

  /**
   * Met à jour les permissions contextuelles d'un utilisateur
   * Cette méthode est utilisée pour synchroniser avec les permissions côté serveur
   */
  updateContextualPermissions(contextualPermissions: ContextualPermission[]): void {
    const currentProfile = this.userPermissionsSubject.value;
    if (!currentProfile) return;

    // Fusionner les nouvelles permissions contextuelles avec les existantes
    const existingPermissions = currentProfile.permissions.filter(cp => 
      cp.context === PermissionContext.GLOBAL
    );

    const updatedProfile: UserPermissionProfile = {
      ...currentProfile,
      permissions: [...existingPermissions, ...contextualPermissions],
      lastUpdated: new Date()
    };

    this.userPermissionsSubject.next(updatedProfile);
    
    // Nettoyer le cache car les permissions ont changé
    this.clearPermissionCache();
  }

  /**
   * Ajoute une permission contextuelle spécifique
   */
  addContextualPermission(
    permission: Permission,
    context: PermissionContext,
    contextId?: string,
    granted: boolean = true
  ): void {
    const currentProfile = this.userPermissionsSubject.value;
    if (!currentProfile) return;

    const contextualPermission: ContextualPermission = {
      permission,
      context,
      contextId,
      granted,
      grantedAt: new Date()
    };

    // Supprimer l'ancienne permission du même type si elle existe
    const filteredPermissions = currentProfile.permissions.filter(cp =>
      !(cp.permission === permission && 
        cp.context === context && 
        cp.contextId === contextId)
    );

    const updatedProfile: UserPermissionProfile = {
      ...currentProfile,
      permissions: [...filteredPermissions, contextualPermission],
      lastUpdated: new Date()
    };

    this.userPermissionsSubject.next(updatedProfile);
    
    // Nettoyer le cache pour cette permission spécifique
    const cacheKey = this.buildCacheKey(permission, context, contextId);
    delete this.permissionCache[cacheKey];
  }

  /**
   * Supprime une permission contextuelle spécifique
   */
  removeContextualPermission(
    permission: Permission,
    context: PermissionContext,
    contextId?: string
  ): void {
    const currentProfile = this.userPermissionsSubject.value;
    if (!currentProfile) return;

    const filteredPermissions = currentProfile.permissions.filter(cp =>
      !(cp.permission === permission && 
        cp.context === context && 
        cp.contextId === contextId)
    );

    const updatedProfile: UserPermissionProfile = {
      ...currentProfile,
      permissions: filteredPermissions,
      lastUpdated: new Date()
    };

    this.userPermissionsSubject.next(updatedProfile);
    
    // Nettoyer le cache pour cette permission spécifique
    const cacheKey = this.buildCacheKey(permission, context, contextId);
    delete this.permissionCache[cacheKey];
  }

  /**
   * Récupère toutes les permissions disponibles pour un rôle
   */
  getPermissionsForRole(role: UserRole): Permission[] {
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    
    // Ajouter les permissions héritées des rôles inférieurs
    const inheritedPermissions = this.getInheritedPermissions(role);
    
    return Array.from(new Set([...rolePermissions, ...inheritedPermissions]));
  }

  /**
   * Vérifie si une permission peut être accordée à un rôle
   */
  canGrantPermissionToRole(permission: Permission, role: UserRole): boolean {
    const availablePermissions = this.getPermissionsForRole(role);
    return availablePermissions.includes(permission);
  }

  /**
   * Récupère la liste des permissions manquantes pour une opération
   */
  getMissingPermissions(
    requiredPermissions: Permission[],
    context?: PermissionContext,
    contextId?: string
  ): Observable<Permission[]> {
    const permissionChecks = requiredPermissions.map(permission => 
      this.hasPermission(permission, context, contextId).pipe(
        map(hasPermission => ({ permission, hasPermission }))
      )
    );

    return combineLatest([...permissionChecks]).pipe(
      map(results => 
        results
          .filter(result => !result.hasPermission)
          .map(result => result.permission)
      )
    );
  }

  // ===== MÉTHODES DE CACHE =====

  /**
   * Nettoie le cache des permissions
   */
  clearPermissionCache(): void {
    Object.keys(this.permissionCache).forEach(key => {
      delete this.permissionCache[key];
    });
  }

  /**
   * Nettoie le cache expiré
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.permissionCache).forEach(key => {
      const cached = this.permissionCache[key];
      if (now - cached.timestamp > cached.ttl) {
        delete this.permissionCache[key];
      }
    });
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Charge les permissions pour un utilisateur spécifique
   */
  private loadUserPermissions(userId: string): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    // Construire le profil de permissions basé sur le rôle
    const rolePermissions = this.getPermissionsForRole(currentUser.role as UserRole);
    const contextualPermissions: ContextualPermission[] = rolePermissions.map(permission => ({
      permission,
      context: PermissionContext.GLOBAL,
      granted: true,
      grantedAt: new Date()
    }));

    // TODO: Réactiver quand la route GET /api/admin/permissions/user/:userId/contextual sera implémentée dans le backend
    // Charger les permissions contextuelles depuis le serveur
    /*this.adminApiService.getUserContextualPermissions(userId)
      .pipe(
        map(serverPermissions => {
          // Fusionner les permissions de rôle avec les permissions contextuelles du serveur
          const allPermissions = [...contextualPermissions];
          
          // Ajouter les permissions contextuelles du serveur
          serverPermissions.forEach(serverPerm => {
            if (serverPerm.permission && serverPerm.context) {
              allPermissions.push({
                permission: serverPerm.permission,
                context: serverPerm.context,
                contextId: serverPerm.contextId,
                granted: serverPerm.granted,
                grantedAt: new Date(serverPerm.grantedAt),
                grantedBy: serverPerm.grantedBy
              });
            }
          });

          return allPermissions;
        }),
        catchError(() => {
          // En cas d'erreur, utiliser seulement les permissions basées sur le rôle
          console.warn('Impossible de charger les permissions contextuelles, utilisation des permissions de rôle uniquement');
          return of(contextualPermissions);
        })
      )
      .subscribe(allPermissions => {
        const userPermissionProfile: UserPermissionProfile = {
          userId: currentUser.id,
          role: currentUser.role as UserRole,
          permissions: allPermissions,
          lastUpdated: new Date()
        };

        this.userPermissionsSubject.next(userPermissionProfile);
      });*/

    // Utiliser temporairement seulement les permissions de rôle
    console.warn('[PermissionService] Route /api/admin/permissions/user/:id/contextual non implémentée dans le backend');
    console.warn('[PermissionService] Utilisation des permissions de rôle uniquement');
    
    const userPermissionProfile: UserPermissionProfile = {
      userId: currentUser.id,
      role: currentUser.role as UserRole,
      permissions: contextualPermissions,
      lastUpdated: new Date()
    };

    this.userPermissionsSubject.next(userPermissionProfile);
  }

  /**
   * Nettoie les permissions utilisateur
   */
  private clearUserPermissions(): void {
    this.userPermissionsSubject.next(null);
    this.clearPermissionCache();
  }

  /**
   * Vérification interne des permissions
   */
  private checkPermissionInternal(
    permission: Permission,
    context?: PermissionContext,
    contextId?: string
  ): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(false);
    }

    // Vérifier si la permission est disponible pour le rôle de l'utilisateur
    const availablePermissions = this.getPermissionsForRole(currentUser.role as UserRole);
    const hasRolePermission = availablePermissions.includes(permission);

    // Si pas de contexte spécifique, utiliser la permission basée sur le rôle
    if (!context || context === PermissionContext.GLOBAL) {
      return of(hasRolePermission);
    }

    // Vérifier les permissions contextuelles
    return this.checkContextualPermission(permission, context, contextId, hasRolePermission);
  }

  /**
   * Vérifie les permissions contextuelles spécifiques
   */
  private checkContextualPermission(
    permission: Permission,
    context: PermissionContext,
    contextId?: string,
    hasRolePermission: boolean = false
  ): Observable<boolean> {
    const currentProfile = this.userPermissionsSubject.value;
    if (!currentProfile) {
      return of(hasRolePermission);
    }

    // Chercher une permission contextuelle spécifique
    const contextualPermission = currentProfile.permissions.find(cp => 
      cp.permission === permission && 
      cp.context === context && 
      (contextId ? cp.contextId === contextId : true)
    );

    if (contextualPermission) {
      return of(contextualPermission.granted);
    }

    // Vérifications contextuelles spécifiques
    switch (context) {
      case PermissionContext.COMMUNITY:
        return this.checkCommunityPermission(permission, contextId, hasRolePermission);
      
      case PermissionContext.CONTENT:
        return this.checkContentPermission(permission, contextId, hasRolePermission);
      
      case PermissionContext.USER:
        return this.checkUserPermission(permission, contextId, hasRolePermission);
      
      default:
        return of(hasRolePermission);
    }
  }

  /**
   * Vérifie les permissions spécifiques aux communautés
   */
  private checkCommunityPermission(
    permission: Permission,
    communityId?: string,
    hasRolePermission: boolean = false
  ): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !communityId) {
      return of(hasRolePermission);
    }

    // Les modérateurs de communauté ont des permissions spéciales
    if (permission === Permission.MODERATE_CONTENT || 
        permission === Permission.MODERATE_COMMUNITY_CONTENT ||
        permission === Permission.MANAGE_COMMUNITIES) {
      
      // Appel API pour vérifier si l'utilisateur est modérateur de cette communauté
      return this.adminApiService.checkCommunityModerator(communityId, currentUser.id)
        .pipe(
          map(result => {
            // Si l'utilisateur est modérateur de cette communauté, il a la permission
            if (result.isModerator) {
              return true;
            }
            // Sinon, on utilise la permission basée sur le rôle
            return hasRolePermission;
          }),
          catchError(() => {
            // En cas d'erreur API, on fallback sur la permission basée sur le rôle
            return of(hasRolePermission);
          })
        );
    }

    return of(hasRolePermission);
  }

  /**
   * Vérifie les permissions spécifiques au contenu
   */
  private checkContentPermission(
    permission: Permission,
    contentId?: string,
    hasRolePermission: boolean = false
  ): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !contentId) {
      return of(hasRolePermission);
    }

    // Les contributeurs peuvent modérer le contenu selon leur rôle
    if (permission === Permission.MODERATE_CONTENT || 
        permission === Permission.APPROVE_WORDS ||
        permission === Permission.REJECT_WORDS) {
      
      // Appel API pour vérifier si l'utilisateur est l'auteur du contenu
      return this.adminApiService.checkContentAuthor(contentId, currentUser.id)
        .pipe(
          map(result => {
            // Si l'utilisateur est l'auteur, il peut avoir des permissions spéciales
            if (result.isAuthor) {
              // L'auteur peut modérer son propre contenu si il a le rôle minimum
              return hasRolePermission;
            }
            // Pour les autres contenus, utiliser uniquement la permission basée sur le rôle
            return hasRolePermission;
          }),
          catchError(() => {
            // En cas d'erreur API, on fallback sur la permission basée sur le rôle
            return of(hasRolePermission);
          })
        );
    }

    return of(hasRolePermission);
  }

  /**
   * Vérifie les permissions spécifiques aux utilisateurs
   */
  private checkUserPermission(
    permission: Permission,
    targetUserId?: string,
    hasRolePermission: boolean = false
  ): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !targetUserId) {
      return of(hasRolePermission);
    }

    // Un utilisateur peut toujours consulter et gérer certains aspects de son propre profil
    if (targetUserId === currentUser.id) {
      if (permission === Permission.VIEW_USER_DETAILS || 
          permission === Permission.VIEW_USERS) {
        return of(true);
      }
    }

    // Les admins ne peuvent pas gérer les super-admins (sauf si ils sont super-admin eux-mêmes)
    if (permission === Permission.EDIT_USERS || 
        permission === Permission.SUSPEND_USERS ||
        permission === Permission.DELETE_USERS ||
        permission === Permission.CHANGE_USER_ROLES) {
      
      // Appel API pour récupérer le rôle de l'utilisateur cible
      return this.adminApiService.getUserRole(targetUserId)
        .pipe(
          map(result => {
            const currentUserLevel = this.getRoleLevel(currentUser.role as UserRole);
            const targetUserLevel = this.getRoleLevel(result.role);
            
            // Un utilisateur ne peut pas gérer un utilisateur de niveau égal ou supérieur
            // Sauf dans le cas des super-admins qui peuvent tout faire
            if (currentUser.role === UserRole.SUPERADMIN) {
              return hasRolePermission;
            }
            
            // Les admins ne peuvent pas gérer les super-admins
            if (currentUserLevel <= targetUserLevel) {
              return false;
            }
            
            return result.canManage && hasRolePermission;
          }),
          catchError(() => {
            // En cas d'erreur API, on fallback sur la permission basée sur le rôle
            return of(hasRolePermission);
          })
        );
    }

    return of(hasRolePermission);
  }

  /**
   * Récupère les permissions héritées des rôles inférieurs
   */
  private getInheritedPermissions(role: UserRole): Permission[] {
    const inheritance: Record<UserRole, UserRole[]> = {
      [UserRole.USER]: [],
      [UserRole.CONTRIBUTOR]: [UserRole.USER],
      [UserRole.ADMIN]: [UserRole.USER, UserRole.CONTRIBUTOR],
      [UserRole.SUPERADMIN]: [UserRole.USER, UserRole.CONTRIBUTOR, UserRole.ADMIN]
    };

    const inheritedRoles = inheritance[role] || [];
    const inheritedPermissions: Permission[] = [];

    inheritedRoles.forEach(inheritedRole => {
      const rolePermissions = DEFAULT_ROLE_PERMISSIONS[inheritedRole] || [];
      inheritedPermissions.push(...rolePermissions);
    });

    return inheritedPermissions;
  }

  /**
   * Vérifie si un rôle est supérieur aux rôles requis
   */
  private hasHigherRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    const userLevel = this.getRoleLevel(userRole);
    const maxRequiredLevel = Math.max(...requiredRoles.map(role => this.getRoleLevel(role)));
    
    return userLevel > maxRequiredLevel;
  }

  /**
   * Récupère le niveau numérique d'un rôle
   */
  private getRoleLevel(role: UserRole): number {
    const roleLevels: Record<UserRole, number> = {
      [UserRole.USER]: 1,
      [UserRole.CONTRIBUTOR]: 2,
      [UserRole.ADMIN]: 3,
      [UserRole.SUPERADMIN]: 4
    };

    return roleLevels[role] || 0;
  }

  /**
   * Construit une clé de cache pour une permission
   */
  private buildCacheKey(
    permission: Permission,
    context?: PermissionContext,
    contextId?: string
  ): string {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    
    return `${userId}:${permission}:${context || 'global'}:${contextId || 'none'}`;
  }

  /**
   * Récupère un résultat mis en cache
   */
  private getCachedResult(cacheKey: string): boolean | null {
    const cached = this.permissionCache[cacheKey];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      delete this.permissionCache[cacheKey];
      return null;
    }

    return cached.result;
  }

  /**
   * Met en cache un résultat de permission
   */
  private cacheResult(cacheKey: string, result: boolean): void {
    this.permissionCache[cacheKey] = {
      result,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    };
  }

  /**
   * Nettoie périodiquement le cache expiré
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanExpiredCache();
    }, this.CACHE_TTL);
  }
}