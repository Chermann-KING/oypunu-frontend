import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RolePermissionService } from '../../services/role-permission.service';
import { ComprehensiveAdminService } from '../../services/comprehensive-admin.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { UserRole, AdminPermissions, User } from '../../models/comprehensive-admin.models';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

/**
 * Composant pour gérer les permissions d'un utilisateur
 */
@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  template: `
    <div class="user-permissions-card">
      <div class="permissions-header">
        <h3>Permissions de {{ user?.username }}</h3>
        <div class="role-badge" [class]="'role-' + user?.role?.toLowerCase()">
          {{ getRoleDisplayName(user?.role) }}
        </div>
      </div>

      <div class="current-permissions" *ngIf="currentPermissions">
        <h4>Permissions actuelles</h4>
        <div class="permissions-grid">
          <div 
            *ngFor="let permission of getPermissionsList()" 
            class="permission-item"
            [class.granted]="hasPermission(permission.key)"
            [class.denied]="!hasPermission(permission.key)"
          >
            <span class="permission-icon">
              {{ hasPermission(permission.key) ? '✓' : '✗' }}
            </span>
            <span class="permission-label">{{ permission.label }}</span>
          </div>
        </div>
      </div>

      <div class="role-management" *appHasPermission="'canChangeUserRoles'">
        <h4>Modifier le rôle</h4>
        <div class="role-options">
          <label 
            *ngFor="let role of getAvailableRoles()" 
            class="role-option"
            [class.selected]="user?.role === role.value"
          >
            <input 
              type="radio" 
              [value]="role.value" 
              [checked]="user?.role === role.value"
              (change)="onRoleChange(role.value)"
              [disabled]="!canAssignRole(role.value) || isUpdating"
            />
            <span class="role-label">{{ role.label }}</span>
            <span class="role-description">{{ role.description }}</span>
          </label>
        </div>
      </div>

      <div class="permissions-actions" *appHasPermission="'canChangeUserRoles'">
        <button 
          class="btn btn-primary" 
          (click)="refreshPermissions()"
          [disabled]="isLoading"
        >
          {{ isLoading ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .user-permissions-card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .permissions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .permissions-header h3 {
      margin: 0;
      color: #1f2937;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .role-badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.875rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .role-user { background: #e5e7eb; color: #374151; }
    .role-contributor { background: #dbeafe; color: #1d4ed8; }
    .role-admin { background: #fef3c7; color: #d97706; }
    .role-superadmin { background: #fecaca; color: #dc2626; }

    .current-permissions {
      margin-bottom: 24px;
    }

    .current-permissions h4 {
      margin: 0 0 16px 0;
      color: #374151;
      font-size: 1rem;
      font-weight: 600;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 12px;
    }

    .permission-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;
    }

    .permission-item.granted {
      background: #f0fdf4;
      border-color: #22c55e;
    }

    .permission-item.denied {
      background: #fef2f2;
      border-color: #ef4444;
    }

    .permission-icon {
      margin-right: 8px;
      font-weight: bold;
    }

    .permission-item.granted .permission-icon {
      color: #22c55e;
    }

    .permission-item.denied .permission-icon {
      color: #ef4444;
    }

    .permission-label {
      font-size: 0.875rem;
      color: #374151;
    }

    .role-management {
      margin-bottom: 24px;
    }

    .role-management h4 {
      margin: 0 0 16px 0;
      color: #374151;
      font-size: 1rem;
      font-weight: 600;
    }

    .role-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .role-option {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .role-option:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .role-option.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .role-option input[type="radio"] {
      margin-right: 12px;
      margin-top: 2px;
    }

    .role-option input[type="radio"]:disabled {
      cursor: not-allowed;
    }

    .role-option:has(input:disabled) {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .role-label {
      font-weight: 600;
      color: #374151;
      display: block;
      margin-bottom: 4px;
    }

    .role-description {
      font-size: 0.875rem;
      color: #6b7280;
      display: block;
    }

    .permissions-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
  `]
})
export class UserPermissionsComponent implements OnInit, OnDestroy {
  @Input() user: User | null = null;

  currentPermissions: AdminPermissions | null = null;
  isLoading = false;
  isUpdating = false;

  private subscriptions = new Subscription();

  constructor(
    private rolePermissionService: RolePermissionService,
    private adminService: ComprehensiveAdminService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadUserPermissions(): void {
    if (!this.user) return;

    this.isLoading = true;
    
    // Pour cet exemple, on utilise les permissions basées sur le rôle
    // Dans un vrai système, vous pourriez avoir des permissions spécifiques par utilisateur
    const userRole = this.user.role;
    const rolePermissions = this.rolePermissionService.getRolePermissions();
    const permissions = rolePermissions[userRole] || [];

    // Construire l'objet AdminPermissions
    this.currentPermissions = {
      canViewUsers: permissions.includes('canViewUsers'),
      canEditUsers: permissions.includes('canEditUsers'),
      canSuspendUsers: permissions.includes('canSuspendUsers'),
      canChangeUserRoles: permissions.includes('canChangeUserRoles'),
      canModerateContent: permissions.includes('canModerateContent'),
      canManageCommunities: permissions.includes('canManageCommunities'),
      canViewAnalytics: permissions.includes('canViewAnalytics'),
      canViewSystemMetrics: permissions.includes('canViewSystemMetrics'),
      canExportData: permissions.includes('canExportData'),
      canManageLanguages: permissions.includes('canManageLanguages'),
      canViewLogs: permissions.includes('canViewLogs'),
      canManageSystem: permissions.includes('canManageSystem')
    };

    this.isLoading = false;
  }

  getPermissionsList(): Array<{ key: keyof AdminPermissions; label: string }> {
    return [
      { key: 'canViewUsers', label: 'Voir les utilisateurs' },
      { key: 'canEditUsers', label: 'Modifier les utilisateurs' },
      { key: 'canSuspendUsers', label: 'Suspendre les utilisateurs' },
      { key: 'canChangeUserRoles', label: 'Modifier les rôles' },
      { key: 'canModerateContent', label: 'Modérer le contenu' },
      { key: 'canManageCommunities', label: 'Gérer les communautés' },
      { key: 'canViewAnalytics', label: 'Voir les analytics' },
      { key: 'canViewSystemMetrics', label: 'Voir les métriques système' },
      { key: 'canExportData', label: 'Exporter les données' },
      { key: 'canManageLanguages', label: 'Gérer les langues' },
      { key: 'canViewLogs', label: 'Voir les logs' },
      { key: 'canManageSystem', label: 'Gérer le système' }
    ] as const;
  }

  getAvailableRoles() {
    const roleNames = this.rolePermissionService.getRoleDisplayNames();
    const roleDescriptions = this.rolePermissionService.getRoleDescriptions();

    return Object.values(UserRole).map(role => ({
      value: role,
      label: roleNames[role],
      description: roleDescriptions[role]
    }));
  }

  getRoleDisplayName(role: UserRole | undefined): string {
    if (!role) return 'Inconnu';
    const roleNames = this.rolePermissionService.getRoleDisplayNames();
    return roleNames[role] || 'Inconnu';
  }

  canAssignRole(role: UserRole): boolean {
    // Cette logique devrait être synchronisée avec le service
    // Pour simplifier, on utilise une vérification basique
    return true; // La vérification réelle se fait dans la directive *appHasPermission
  }

  onRoleChange(newRole: UserRole): void {
    if (!this.user || this.user.role === newRole || this.isUpdating) return;

    this.isUpdating = true;
    
    this.subscriptions.add(
      this.adminService.updateUserRole(this.user._id, newRole).subscribe({
        next: (response) => {
          if (response.success) {
            this.user!.role = newRole;
            this.loadUserPermissions();
            this.toastService.success(`Rôle mis à jour vers ${this.getRoleDisplayName(newRole)}`);
          }
          this.isUpdating = false;
        },
        error: (error) => {
          this.toastService.error('Erreur lors de la mise à jour du rôle');
          this.isUpdating = false;
        }
      })
    );
  }

  refreshPermissions(): void {
    this.loadUserPermissions();
    this.toastService.success('Permissions actualisées');
  }

  /**
   * Helper method pour accéder aux permissions de manière type-safe
   */
  hasPermission(permission: keyof AdminPermissions): boolean {
    return this.currentPermissions ? this.currentPermissions[permission] : false;
  }
}