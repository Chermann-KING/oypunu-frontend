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
import { UserRole } from '../../../core/models/admin';

@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input('appHasPermission') permission!: string;
  @Input('appHasPermissionRole') requiredRole?: UserRole;
  @Input('appHasPermissionMinRole') minimumRole?: UserRole;
  @Input('appHasPermissionRoles') allowedRoles?: UserRole[];
  @Input('appHasPermissionElse') elseTemplate?: TemplateRef<any>;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkPermissions(): void {
    // Si on a spécifié un rôle exact requis
    if (this.requiredRole) {
      this.permissionService
        .hasExactRole(this.requiredRole)
        .pipe(takeUntil(this.destroy$))
        .subscribe((hasPermission) => {
          this.updateView(hasPermission);
        });
      return;
    }

    // Si on a spécifié un rôle minimum
    if (this.minimumRole) {
      this.permissionService
        .hasMinimumRole(this.minimumRole)
        .pipe(takeUntil(this.destroy$))
        .subscribe((hasPermission) => {
          this.updateView(hasPermission);
        });
      return;
    }

    // Si on a spécifié une liste de rôles autorisés
    if (this.allowedRoles && this.allowedRoles.length > 0) {
      this.permissionService
        .hasAnyRole(this.allowedRoles)
        .pipe(takeUntil(this.destroy$))
        .subscribe((hasPermission) => {
          this.updateView(hasPermission);
        });
      return;
    }

    // Vérification par permission spécifique (pour l'extension future)
    if (this.permission) {
      this.permissionService
        .getCurrentRole()
        .pipe(takeUntil(this.destroy$))
        .subscribe((userRole) => {
          const hasPermission = this.permissionService.roleHasPermission(
            userRole,
            this.permission
          );
          this.updateView(hasPermission);
        });
      return;
    }

    // Si aucune condition n'est spécifiée, ne pas afficher
    this.updateView(false);
  }

  private updateView(hasPermission: boolean): void {
    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;

      // Afficher le template alternatif si disponible
      if (this.elseTemplate) {
        this.viewContainer.createEmbeddedView(this.elseTemplate);
      }
    } else if (!hasPermission && !this.hasView && this.elseTemplate) {
      this.viewContainer.createEmbeddedView(this.elseTemplate);
    }
  }
}
