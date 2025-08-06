import { UserRole } from './../../../../core/models/admin';
/**
 * @fileoverview Composant présentationnel User Permissions Modal - SOLID Principles
 *
 * Composant pur qui affiche et gère les permissions d'un utilisateur dans une modale.
 * Ne contient aucune logique métier, uniquement la présentation et la gestion UI.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { User } from '../../models/admin.models';
import { Permission, PermissionGroup } from '../../models/permissions.models';

/**
 * Interface pour les permissions groupées dans la modale
 */
export interface ModalPermissionGroup {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: ModalPermission[];
}

/**
 * Interface pour une permission individuelle dans la modale
 */
export interface ModalPermission {
  readonly id: Permission;
  readonly name: string;
  readonly description: string;
  readonly granted: boolean;
  readonly disabled: boolean;
  readonly category: 'basic' | 'advanced' | 'dangerous';
}

/**
 * Interface pour les actions de la modale
 */
export interface UserPermissionAction {
  readonly type:
    | 'save'
    | 'cancel'
    | 'reset'
    | 'grant_all'
    | 'revoke_all'
    | 'change_role';
  readonly user: User;
  readonly permissions?: Permission[];
  readonly newRole?: UserRole;
}

/**
 * Interface pour les changements de permissions
 */
export interface PermissionChange {
  readonly permission: Permission;
  readonly granted: boolean;
  readonly previouslyGranted: boolean;
}

/**
 * Composant UserPermissionsModal - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher et permettre la modification des permissions utilisateur
 */
@Component({
  selector: 'app-user-permissions-modal',
  standalone: false,
  templateUrl: './user-permissions-modal.component.html',
  styleUrls: ['./user-permissions-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPermissionsModalComponent {
  public UserRole: typeof UserRole = UserRole;

  // ===== INPUTS =====

  @Input() visible: boolean = false;
  @Input() user: User | null = null;
  @Input() permissionGroups: ModalPermissionGroup[] = [];
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;
  @Input() canModifyPermissions: () => boolean = () => true;
  @Input() canChangeRole: () => boolean = () => true;
  @Input() canAssignRole: (role: UserRole) => boolean = () => true;

  // ===== OUTPUTS =====

  @Output() actionClicked = new EventEmitter<UserPermissionAction>();
  @Output() permissionChanged = new EventEmitter<{
    permission: Permission;
    granted: boolean;
  }>();
  @Output() roleChanged = new EventEmitter<{ user: User; newRole: UserRole }>();
  @Output() modalClosed = new EventEmitter<void>();
  @Output() refreshRequested = new EventEmitter<void>();

  // ===== PROPRIÉTÉS INTERNES =====

  public selectedRole: UserRole | null = null;
  private expandedGroups = new Set<string>();
  private originalPermissions = new Map<Permission, boolean>();
  private currentPermissions = new Map<Permission, boolean>();

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Initialisation des permissions originales
   */
  ngOnInit(): void {
    if (this.user) {
      this.selectedRole = this.user.role as UserRole;
      this.initializePermissions();
    }
  }

  /**
   * Réagit aux changements d'inputs
   */
  ngOnChanges(): void {
    if (this.user && this.permissionGroups.length > 0) {
      this.initializePermissions();
    }
  }

  /**
   * Gestion des actions principales
   */
  public onAction(type: UserPermissionAction['type']): void {
    if (!this.user) return;

    switch (type) {
      case 'save':
        this.actionClicked.emit({
          type: 'save',
          user: this.user,
          permissions: this.getChangedPermissions(),
          newRole:
            this.selectedRole !== this.user.role
              ? this.selectedRole!
              : undefined,
        });
        break;

      case 'cancel':
        this.resetChanges();
        this.modalClosed.emit();
        break;

      case 'reset':
        this.resetChanges();
        break;

      case 'grant_all':
        this.grantAllPermissions();
        break;

      case 'revoke_all':
        this.revokeAllPermissions();
        break;

      default:
        this.actionClicked.emit({ type, user: this.user });
    }
  }

  /**
   * Gestion du changement de permission individuelle
   */
  public onPermissionChange(permission: ModalPermission, event: Event): void {
    const target = event.target as HTMLInputElement;
    const granted = target.checked;

    this.currentPermissions.set(permission.id, granted);
    this.permissionChanged.emit({ permission: permission.id, granted });
  }

  /**
   * Gestion du changement de rôle
   */
  public onRoleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value as UserRole;

    this.selectedRole = newRole;

    if (this.user) {
      this.roleChanged.emit({ user: this.user, newRole });
    }
  }

  /**
   * Gestion du clic sur le backdrop
   */
  public onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onAction('cancel');
    }
  }

  /**
   * Actualisation des données
   */
  public onRefresh(): void {
    this.refreshRequested.emit();
  }

  /**
   * Toggle d'un groupe de permissions
   */
  public toggleGroup(groupId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }
  }

  /**
   * Vérifie si un groupe est étendu
   */
  public isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups.has(groupId);
  }

  /**
   * Obtient l'icône de toggle d'un groupe
   */
  public getGroupToggleIcon(groupId: string): string {
    return this.isGroupExpanded(groupId)
      ? 'icon-chevron-up'
      : 'icon-chevron-down';
  }

  /**
   * Compte les permissions accordées dans un groupe
   */
  public getGroupGrantedCount(group: ModalPermissionGroup): number {
    return group.permissions.filter((p) => p.granted).length;
  }

  /**
   * Vérifie s'il y a des changements
   */
  public hasChanges(): boolean {
    if (this.selectedRole !== this.user?.role) {
      return true;
    }

    for (const [permission, current] of this.currentPermissions) {
      const original = this.originalPermissions.get(permission);
      if (current !== original) {
        return true;
      }
    }

    return false;
  }

  /**
   * Obtient la liste des changements de permissions
   */
  public getPermissionChanges(): PermissionChange[] {
    const changes: PermissionChange[] = [];

    for (const [permission, current] of this.currentPermissions) {
      const original = this.originalPermissions.get(permission) || false;
      if (current !== original) {
        changes.push({
          permission,
          granted: current,
          previouslyGranted: original,
        });
      }
    }

    return changes;
  }

  /**
   * Vérifie si toutes les permissions sont accordées
   */
  public isAllGranted(): boolean {
    for (const group of this.permissionGroups) {
      for (const permission of group.permissions) {
        if (!permission.disabled && !permission.granted) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Vérifie si toutes les permissions sont révoquées
   */
  public isAllRevoked(): boolean {
    for (const group of this.permissionGroups) {
      for (const permission of group.permissions) {
        if (!permission.disabled && permission.granted) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * TrackBy functions pour l'optimisation
   */
  public trackByGroupId(index: number, group: ModalPermissionGroup): string {
    return group.id;
  }

  public trackByPermissionId(
    index: number,
    permission: ModalPermission
  ): string {
    return permission.id;
  }

  public trackByChangeId(index: number, change: PermissionChange): string {
    return change.permission;
  }

  /**
   * Utilitaires de formatage
   */
  public getUserInitials(user: User): string {
    const firstName = user.firstName || user.username.charAt(0);
    const lastName = user.lastName || user.username.charAt(1) || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

  public getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      user: 'Utilisateur',
      contributor: 'Contributeur',
      admin: 'Admin',
      superadmin: 'Super Admin',
    };
    return labels[role] || role;
  }

  public getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      basic: 'Base',
      advanced: 'Avancé',
      dangerous: 'Critique',
    };
    return labels[category] || category;
  }

  public getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      basic: 'Permissions de base sans risque',
      advanced: 'Permissions avancées nécessitant une attention',
      dangerous: 'Permissions critiques pouvant affecter le système',
    };
    return descriptions[category] || category;
  }

  public getPermissionName(permission: Permission): string {
    return permission.replace(/_/g, ' ').toLowerCase();
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Initialise les permissions originales et courantes
   */
  private initializePermissions(): void {
    this.originalPermissions.clear();
    this.currentPermissions.clear();

    for (const group of this.permissionGroups) {
      for (const permission of group.permissions) {
        this.originalPermissions.set(permission.id, permission.granted);
        this.currentPermissions.set(permission.id, permission.granted);
      }
    }
  }

  /**
   * Réinitialise tous les changements
   */
  private resetChanges(): void {
    this.selectedRole = this.user?.role as UserRole;

    for (const [permission, original] of this.originalPermissions) {
      this.currentPermissions.set(permission, original);
    }

    this.updatePermissionGroups();
  }

  /**
   * Accorde toutes les permissions
   */
  private grantAllPermissions(): void {
    for (const group of this.permissionGroups) {
      for (const permission of group.permissions) {
        if (!permission.disabled) {
          this.currentPermissions.set(permission.id, true);
        }
      }
    }

    this.updatePermissionGroups();
  }

  /**
   * Révoque toutes les permissions
   */
  private revokeAllPermissions(): void {
    for (const group of this.permissionGroups) {
      for (const permission of group.permissions) {
        if (!permission.disabled) {
          this.currentPermissions.set(permission.id, false);
        }
      }
    }

    this.updatePermissionGroups();
  }

  /**
   * Met à jour les groupes de permissions avec les changements
   */
  private updatePermissionGroups(): void {
    for (const group of this.permissionGroups) {
      for (const permission of group.permissions) {
        const newGranted = this.currentPermissions.get(permission.id);
        if (newGranted !== undefined) {
          (permission as any).granted = newGranted;
        }
      }
    }
  }

  /**
   * Obtient les permissions qui ont changé
   */
  private getChangedPermissions(): Permission[] {
    const changed: Permission[] = [];

    for (const [permission, current] of this.currentPermissions) {
      const original = this.originalPermissions.get(permission) || false;
      if (current !== original) {
        changed.push(permission);
      }
    }

    return changed;
  }
}
