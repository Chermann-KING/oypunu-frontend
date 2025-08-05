import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ComprehensiveAdminService } from '../services/comprehensive-admin.service';
import { AdminPermissions } from '../models/comprehensive-admin.models';
import { UserRole } from '../../../core/models/admin';

/**
 * Directive structurelle pour contrôler l'affichage basé sur les permissions
 * Usage: *appHasPermission="'canViewUsers'"
 * Usage: *appHasPermission="['canViewUsers', 'canEditUsers']"
 * Usage: *appHasRole="UserRole.ADMIN"
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input() appHasPermission: string | string[] = '';
  @Input() appHasRole: UserRole | undefined;
  @Input() appRequireAll: boolean = false; // Si true, toutes les permissions sont requises

  private subscription = new Subscription();
  private currentUser: any = null;
  private userPermissions: AdminPermissions | null = null;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private adminService: ComprehensiveAdminService
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements d'utilisateur
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.checkPermissions();
      })
    );

    // S'abonner aux changements de permissions
    this.subscription.add(
      this.adminService.userPermissions$.subscribe(permissions => {
        this.userPermissions = permissions;
        this.checkPermissions();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private checkPermissions(): void {
    if (!this.currentUser) {
      this.viewContainer.clear();
      return;
    }

    const userRole = this.currentUser.role as UserRole;
    let hasAccess = true;

    // Vérifier le rôle si spécifié
    if (this.appHasRole) {
      hasAccess = this.adminService.hasMinimumRole(this.appHasRole, userRole);
    }

    // Vérifier les permissions si spécifiées
    if (hasAccess && this.appHasPermission) {
      const permissions = Array.isArray(this.appHasPermission) 
        ? this.appHasPermission 
        : [this.appHasPermission];

      if (this.appRequireAll) {
        // Toutes les permissions doivent être présentes
        hasAccess = permissions.every(permission => 
          this.hasSpecificPermission(permission as keyof AdminPermissions)
        );
      } else {
        // Au moins une permission doit être présente
        hasAccess = permissions.some(permission => 
          this.hasSpecificPermission(permission as keyof AdminPermissions)
        );
      }
    }

    // Afficher ou masquer l'élément
    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private hasSpecificPermission(permission: keyof AdminPermissions): boolean {
    if (this.userPermissions) {
      return this.userPermissions[permission] || false;
    }

    // Fallback: vérifier par rôle si les permissions ne sont pas encore chargées
    if (this.currentUser) {
      const userRole = this.currentUser.role as UserRole;
      return this.hasPermissionByRole(userRole, permission as string);
    }

    return false;
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