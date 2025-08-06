/**
 * @fileoverview Directive structurelle pour les permissions - NgModule (No-Standalone)
 *
 * Directive Angular qui affiche conditionnellement des éléments selon
 * les permissions de l'utilisateur. Respecte les principes SOLID.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { PermissionService } from '../services/permission.service';
import { Permission, PermissionContext } from '../models/permissions.models';
import { UserRole } from '../models/admin.models';

/**
 * Contexte de la directive passé au template
 */
export interface HasPermissionContext {
  readonly $implicit: boolean;
  readonly hasPermission: boolean;
  readonly userRole: UserRole | null;
}

/**
 * Directive structurelle *appHasPermission - Angular 19 No-Standalone
 *
 * Usage:
 * ```html
 * <div *appHasPermission="'canViewUsers'">Contenu visible avec permission</div>
 * <div *appHasPermission="['canViewUsers', 'canEditUsers']; requireAll: true">Toutes permissions requises</div>
 * <div *appHasPermission="'canModerateContent'; context: 'community'; contextId: communityId">Permission contextuelle</div>
 * ```
 */
@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;
  private currentPermissions: Permission[] = [];
  private currentContext?: PermissionContext;
  private currentContextId?: string;
  private currentRequireAll = false;

  // ===== INPUTS =====

  /**
   * Permission(s) requise(s) - peut être une permission unique ou un tableau
   */
  @Input()
  set appHasPermission(
    permissions: Permission | Permission[] | string | string[]
  ) {
    // Convertir en tableau de permissions typées
    if (typeof permissions === 'string') {
      this.currentPermissions = [permissions as Permission];
    } else if (Array.isArray(permissions)) {
      this.currentPermissions = permissions.map((p) => p as Permission);
    } else {
      this.currentPermissions = [permissions];
    }

    this.updateView();
  }

  /**
   * Contexte de la permission (optionnel)
   */
  @Input()
  set appHasPermissionContext(context: PermissionContext) {
    this.currentContext = context;
    this.updateView();
  }

  /**
   * ID du contexte (optionnel)
   */
  @Input()
  set appHasPermissionContextId(contextId: string) {
    this.currentContextId = contextId;
    this.updateView();
  }

  /**
   * Si true, toutes les permissions sont requises. Si false, au moins une suffit.
   */
  @Input()
  set appHasPermissionRequireAll(requireAll: boolean) {
    this.currentRequireAll = requireAll;
    this.updateView();
  }

  constructor(
    private readonly templateRef: TemplateRef<HasPermissionContext>,
    protected readonly viewContainer: ViewContainerRef,
    private readonly permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements de permissions utilisateur
    this.permissionService.userPermissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Met à jour l'affichage selon les permissions
   * Respecte le Single Responsibility Principle
   */
  private updateView(): void {
    if (this.currentPermissions.length === 0) {
      // Si aucune permission spécifiée, afficher par défaut
      this.showTemplate(true);
      return;
    }

    // Vérifier les permissions selon la stratégie (requireAll ou requireAny)
    const permissionCheck$ = this.currentRequireAll
      ? this.permissionService.hasAllPermissions(
          this.currentPermissions,
          this.currentContext,
          this.currentContextId
        )
      : this.permissionService.hasAnyPermission(
          this.currentPermissions,
          this.currentContext,
          this.currentContextId
        );

    permissionCheck$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (hasPermission) => {
        this.showTemplate(hasPermission);
      },
      error: (error) => {
        console.error(
          '[HasPermissionDirective] Erreur lors de la vérification des permissions:',
          error
        );
        // En cas d'erreur, ne pas afficher par sécurité
        this.showTemplate(false);
      },
    });
  }

  /**
   * Affiche ou cache le template selon les permissions
   */
  protected showTemplate(hasPermission: boolean): void {
    const context: HasPermissionContext = {
      $implicit: hasPermission,
      hasPermission,
      userRole: this.getCurrentUserRole(),
    };

    if (hasPermission && !this.hasView) {
      // Afficher le template
      this.viewContainer.createEmbeddedView(this.templateRef, context);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      // Cacher le template
      this.viewContainer.clear();
      this.hasView = false;
    } else if (this.hasView) {
      // Mettre à jour le contexte si la vue existe déjà
      const existingView = this.viewContainer.get(0) as any;
      if (existingView?.context) {
        Object.assign(existingView.context, context);
      }
    }
  }

  /**
   * Récupère le rôle de l'utilisateur actuel
   */
  private getCurrentUserRole(): UserRole | null {
    // Cette méthode pourrait être optimisée en injectant AuthService
    // mais pour éviter la dépendance circulaire, on utilise PermissionService
    const userPermissions = this.permissionService.getUserPermissionProfile();
    let currentRole: UserRole | null = null;

    userPermissions
      .subscribe((profile) => {
        currentRole = profile?.role || null;
      })
      .unsubscribe();

    return currentRole;
  }
}

/**
 * Directive alternative pour vérifier seulement les rôles
 * Plus simple et plus performante quand seuls les rôles sont nécessaires
 *
 * Usage:
 * ```html
 * <div *appHasRole="'admin'">Contenu admin</div>
 * <div *appHasRole="['admin', 'superadmin']">Contenu admin ou superadmin</div>
 * ```
 */
@Directive({
  selector: '[appHasRole]',
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private hasView = false;
  private currentRoles: UserRole[] = [];

  @Input()
  set appHasRole(roles: UserRole | UserRole[] | string | string[]) {
    if (typeof roles === 'string') {
      this.currentRoles = [roles as UserRole];
    } else if (Array.isArray(roles)) {
      this.currentRoles = roles.map((r) => r as UserRole);
    } else {
      this.currentRoles = [roles];
    }

    this.updateView();
  }

  constructor(
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
    private readonly permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.permissionService.userPermissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (this.currentRoles.length === 0) {
      this.showTemplate(true);
      return;
    }

    const hasRole = this.permissionService.hasRole(this.currentRoles);
    this.showTemplate(hasRole);
  }

  private showTemplate(hasRole: boolean): void {
    if (hasRole && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasRole && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/**
 * Directive pour afficher du contenu alternatif quand les permissions manquent
 *
 * Usage:
 * ```html
 * <div *appHasPermission="'canViewUsers'; else: noPermissionTemplate">
 *   Contenu avec permission
 * </div>
 * <ng-template #noPermissionTemplate>
 *   <p>Vous n'avez pas la permission de voir ce contenu</p>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[appHasPermission][appHasPermissionElse]',
})
export class HasPermissionElseDirective extends HasPermissionDirective {
  @Input() appHasPermissionElse?: TemplateRef<any>;

  protected override showTemplate(hasPermission: boolean): void {
    if (hasPermission) {
      // Afficher le template principal
      super.showTemplate(true);
    } else if (this.appHasPermissionElse) {
      // Afficher le template alternatif
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.appHasPermissionElse);
    } else {
      // Pas de template alternatif, cacher complètement
      super.showTemplate(false);
    }
  }
}
