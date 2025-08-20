/**
 * @fileoverview Container pour la gestion des utilisateurs
 *
 * Container intelligent qui gère l'affichage et les actions sur les utilisateurs.
 * Intègre les 7 routes backend de gestion utilisateur.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserManagementTableComponent } from '../../components/user-management/user-management-table.component';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import {
  takeUntil,
  map,
  catchError,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { Router } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { PermissionService } from '../../services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  User,
  UserRole,
  UserFilters,
  PaginatedResponse,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';
import {
  UserTableAction,
  UserTableSort,
} from '../../components/user-management/user-management-table.component';
import { ConfirmationConfig } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';

/**
 * Interface pour l'état de la gestion utilisateur
 */
interface UserAdminState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly users: User[];
  readonly totalUsers: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly filters: UserFilters;
  readonly selectedUsers: string[];
  readonly sort: UserTableSort | null;
}

/**
 * Container UserAdmin - Single Responsibility Principle
 */
@Component({
  selector: 'app-user-admin-container',
  standalone: false,
  templateUrl: './user-admin.container.html',
  styleUrls: ['./user-admin.container.scss'],
})
export class UserAdminContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // État de la gestion utilisateur
  public readonly userAdminState$: Observable<UserAdminState>;

  private readonly userAdminStateSubject = new BehaviorSubject<UserAdminState>({
    isLoading: true,
    error: null,
    users: [],
    totalUsers: 0,
    currentPage: 1,
    pageSize: 10,
    filters: {},
    selectedUsers: [],
    sort: null,
  });

  // Contrôles de recherche et filtres
  public searchTerm = '';
  private readonly searchSubject = new Subject<string>();

  // Modal de confirmation
  public showConfirmationModal = false;
  public confirmationConfig: ConfirmationConfig = {
    title: '',
    message: '',
  };
  private confirmationAction?: (inputValue?: string) => void;

  // Modal de changement de rôle
  public showRoleChangeModal = false;
  public roleChangeUser: User | null = null;
  public availableRoles: { value: UserRole; label: string }[] = [
    { value: UserRole.USER, label: 'Utilisateur' },
    { value: UserRole.CONTRIBUTOR, label: 'Contributeur' },
    { value: UserRole.ADMIN, label: 'Administrateur' },
    { value: UserRole.SUPERADMIN, label: 'Super-Administrateur' },
  ];

  constructor(
    private readonly router: Router,
    private readonly adminApiService: AdminApiService,
    private readonly permissionService: PermissionService,
    private readonly toastService: ToastService
  ) {
    this.userAdminState$ = this.userAdminStateSubject.asObservable();

    // Configuration de la recherche avec debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.updateFilters({ search: searchTerm || undefined });
      });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.userAdminStateSubject.complete();
  }

  /**
   * Charge la liste des utilisateurs
   */
  private loadUsers(): void {
    const currentState = this.userAdminStateSubject.value;

    this.userAdminStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    this.adminApiService
      .getUsers(
        currentState.currentPage,
        currentState.pageSize,
        currentState.filters
      )
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.userAdminStateSubject.next({
            ...currentState,
            isLoading: false,
            error: 'Erreur lors du chargement des utilisateurs',
          });
          throw error;
        })
      )
      .subscribe((response) => {
        this.userAdminStateSubject.next({
          ...currentState,
          isLoading: false,
          error: null,
          users: response.data,
          totalUsers: response.total,
          selectedUsers: [],
        });
      });
  }

  /**
   * Met à jour les filtres et recharge les données
   */
  private updateFilters(newFilters: Partial<UserFilters>): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      filters: { ...currentState.filters, ...newFilters },
      currentPage: 1,
      selectedUsers: [],
    });
    this.loadUsers();
  }

  // ===== MÉTHODES PUBLIQUES POUR LE TEMPLATE =====

  /**
   * Gestion de la recherche
   */
  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(target.value);
  }

  /**
   * Gestion du filtre par rôle
   */
  public onRoleFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const role = target.value as UserRole | '';
    this.updateFilters({ role: role || undefined });
  }

  /**
   * Gestion du filtre par statut
   */
  public onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const status = target.value as
      | 'active'
      | 'suspended'
      | 'banned'
      | 'all'
      | '';
    this.updateFilters({ status: status || undefined });
  }

  /**
   * Efface tous les filtres
   */
  public clearFilters(): void {
    this.searchTerm = '';
    this.updateFilters({
      search: undefined,
      role: undefined,
      status: undefined,
    });
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  public hasActiveFilters(filters: UserFilters): boolean {
    return !!(filters.search || filters.role || filters.status);
  }

  /**
   * Actions sur les utilisateurs
   */
  public viewUserDetails(userId: string): void {
    console.log('🔍 Voir détails utilisateur:', userId);
    this.toastService.warning(
      'Fonctionnalité en cours de développement',
      'La page de détail utilisateur sera bientôt disponible.'
    );
  }

  public editUser(userId: string): void {
    console.log('✏️ Éditer utilisateur:', userId);
    this.toastService.warning(
      'Fonctionnalité en cours de développement',
      "La page d'édition utilisateur sera bientôt disponible."
    );
  }

  /**
   * Export des utilisateurs
   */
  public exportUsers(): void {
    console.log('📤 Export utilisateurs');
    this.toastService.warning(
      'Fonctionnalité en cours de développement',
      "L'export des utilisateurs sera bientôt disponible côté backend."
    );
  }

  /**
   * Pagination
   */
  public goToPage(page: number): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      currentPage: page,
    });
    this.loadUsers();
  }

  public hasNextPage(state: UserAdminState): boolean {
    return state.currentPage * state.pageSize < state.totalUsers;
  }

  public getTotalPages(state: UserAdminState): number {
    return Math.ceil(state.totalUsers / state.pageSize);
  }

  /**
   * Méthodes utilitaires
   */
  public trackByUserId(index: number, user: User): string {
    return user.id;
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Actif',
      suspended: 'Suspendu',
      banned: 'Banni',
    };
    return labels[status] || status;
  }

  public retryLoad(): void {
    this.loadUsers();
  }

  // ===== MÉTHODES POUR USERHANDLETABLE COMPONENT =====

  /**
   * Gère les actions individuelles sur les utilisateurs
   */
  public handleUserAction(action: UserTableAction): void {
    const userId = action.user.id;
    console.log('🎯 Action reçue:', {
      type: action.type,
      userId,
      payload: action.payload,
    });

    switch (action.type) {
      case 'view':
        this.viewUserDetails(userId);
        break;
      case 'edit':
        this.editUser(userId);
        break;
      case 'suspend':
        this.suspendUser(userId);
        break;
      case 'activate':
        this.activateUser(userId);
        break;
      case 'change_role':
        this.openRoleChangeModal(userId, action.user);
        break;
      case 'permissions':
        this.manageUserPermissions(userId);
        break;
      case 'delete':
        this.deleteUser(userId);
        break;
      default:
        console.warn('Action utilisateur non gérée:', action.type);
    }
  }

  /**
   * Gère les actions en lot sur les utilisateurs
   */
  public handleBulkAction(event: { type: string; users: string[] }): void {
    switch (event.type) {
      case 'suspend':
        this.bulkSuspendUsers(event.users);
        break;
      case 'activate':
        this.bulkActivateUsers(event.users);
        break;
      case 'delete':
        this.bulkDeleteUsers(event.users);
        break;
      case 'export':
        this.exportSelectedUsers(event.users);
        break;
      default:
        console.warn('Action en lot non gérée:', event.type);
    }
  }

  /**
   * Gère les changements de sélection des utilisateurs
   */
  public handleSelectionChange(selectedUsers: string[]): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      selectedUsers,
    });
  }

  /**
   * Gère les changements de tri
   */
  public handleSortChange(sort: UserTableSort): void {
    const currentState = this.userAdminStateSubject.value;
    this.userAdminStateSubject.next({
      ...currentState,
      sort,
      currentPage: 1, // Reset to first page when sorting changes
    });
    this.loadUsers();
  }

  /**
   * Gère les changements de filtres depuis le tableau
   */
  public handleFilterChange(filters: UserFilters): void {
    this.updateFilters(filters);
  }

  // ===== ACTIONS SPÉCIFIQUES SUR LES UTILISATEURS =====

  private suspendUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Confirmer la suspension',
      message: 'Êtes-vous sûr de vouloir suspendre cet utilisateur ?',
      confirmText: 'Suspendre',
      cancelText: 'Annuler',
      type: 'warning',
      showInput: true,
      inputLabel: 'Raison de la suspension (optionnel)',
      inputPlaceholder: 'Expliquez pourquoi vous suspendez cet utilisateur...',
    };

    this.confirmationAction = (inputValue?: string) => {
      this.adminApiService
        .suspendUser(userId, inputValue || '')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Utilisateur suspendu:', userId);
            this.toastService.success(
              'Utilisateur suspendu',
              "L'utilisateur a été suspendu avec succès."
            );
            this.loadUsers();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suspension:', error);
            this.toastService.error(
              'Erreur de suspension',
              "Vérifiez que vous avez les permissions nécessaires et que l'utilisateur n'est pas un superadmin."
            );
          },
        });
    };

    this.showConfirmationModal = true;
  }

  private activateUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Confirmer la réactivation',
      message: 'Êtes-vous sûr de vouloir réactiver cet utilisateur ?',
      confirmText: 'Réactiver',
      cancelText: 'Annuler',
      type: 'info',
      showInput: true,
      inputLabel: 'Raison de la réactivation (optionnel)',
      inputPlaceholder: 'Expliquez pourquoi vous réactivez cet utilisateur...',
    };

    this.confirmationAction = (inputValue?: string) => {
      this.adminApiService
        .reactivateUser(userId, inputValue || '')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Utilisateur activé:', userId);
            this.toastService.success(
              'Utilisateur réactivé',
              "L'utilisateur a été réactivé avec succès."
            );
            this.loadUsers();
          },
          error: (error) => {
            console.error("❌ Erreur lors de l'activation:", error);
            this.toastService.error(
              'Erreur de réactivation',
              'Vérifiez que vous avez les permissions nécessaires.'
            );
          },
        });
    };

    this.showConfirmationModal = true;
  }

  private openRoleChangeModal(userId: string, user: User): void {
    this.roleChangeUser = user;
    this.showRoleChangeModal = true;
  }

  public onRoleChangeConfirm(newRole: UserRole): void {
    if (!this.roleChangeUser) return;

    const userId = this.roleChangeUser.id;
    const roleLabels = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super-Administrateur',
    };

    this.confirmationConfig = {
      title: 'Confirmer le changement de rôle',
      message: `Êtes-vous sûr de vouloir changer le rôle de "${this.roleChangeUser.username}" vers "${roleLabels[newRole]}" ?`,
      confirmText: 'Changer le rôle',
      cancelText: 'Annuler',
      type: 'warning',
    };

    this.confirmationAction = (inputValue?: string) => {
      this.adminApiService
        .updateUserRole(userId, newRole)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.success(
              'Rôle modifié',
              "Le rôle de l'utilisateur a été modifié avec succès."
            );
            this.loadUsers();
            this.showRoleChangeModal = false;
            this.roleChangeUser = null;
          },
          error: () => {
            this.toastService.error(
              'Erreur de changement de rôle',
              'Vérifiez que vous avez les permissions nécessaires.'
            );
          },
        });
    };

    this.showRoleChangeModal = false;
    this.showConfirmationModal = true;
  }

  public onRoleChangeCancel(): void {
    this.showRoleChangeModal = false;
    this.roleChangeUser = null;
  }

  private manageUserPermissions(userId: string): void {
    // Navigation vers la page de gestion des permissions ou ouverture du modal
    this.router.navigate(['/admin/users', userId, 'permissions']);
  }

  private deleteUser(userId: string): void {
    this.confirmationConfig = {
      title: 'Confirmer la suppression',
      message:
        'Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.',
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      type: 'danger',
    };

    this.confirmationAction = (inputValue?: string) => {
      // Pour l'instant, afficher un toast d'information
      this.toastService.warning(
        'Fonctionnalité en cours de développement',
        "La suppression d'utilisateurs sera bientôt disponible côté backend."
      );
      console.warn(
        "⚠️ Tentative de suppression d'utilisateur - endpoint non disponible"
      );
    };

    this.showConfirmationModal = true;
  }

  // ===== ACTIONS EN LOT =====

  private bulkSuspendUsers(userIds: string[]): void {
    this.toastService.warning(
      'Fonctionnalité en cours de développement',
      'Les actions en lot seront bientôt disponibles côté backend.'
    );
    console.warn('⚠️ Tentative de suspension en lot - endpoint non disponible');
  }

  private bulkActivateUsers(userIds: string[]): void {
    this.toastService.warning(
      'Fonctionnalité en cours de développement',
      'Les actions en lot seront bientôt disponibles côté backend.'
    );
    console.warn("⚠️ Tentative d'activation en lot - endpoint non disponible");
  }

  private bulkDeleteUsers(userIds: string[]): void {
    this.toastService.warning(
      'Fonctionnalité en cours de développement',
      'Les actions en lot seront bientôt disponibles côté backend.'
    );
    console.warn(
      '⚠️ Tentative de suppression en lot - endpoint non disponible'
    );
  }

  private exportSelectedUsers(userIds: string[]): void {
    this.adminApiService
      .exportUsers(userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Créer et télécharger le fichier CSV
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `users-export-${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error("Erreur lors de l'export:", error);
          this.toastService.error(
            "Erreur d'export",
            "Une erreur est survenue lors de l'export des utilisateurs."
          );
        },
      });
  }

  // ===== MÉTHODES POUR LA MODAL DE CONFIRMATION =====

  /**
   * Confirme l'action de la modal
   */
  public onConfirmAction(inputValue: string): void {
    this.showConfirmationModal = false;
    if (this.confirmationAction) {
      this.confirmationAction(inputValue);
      this.confirmationAction = undefined;
    }
  }

  /**
   * Annule l'action de la modal
   */
  public onCancelAction(): void {
    this.showConfirmationModal = false;
    this.confirmationAction = undefined;
  }

  /**
   * Obtient le libellé d'un rôle
   */
  public getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super-Administrateur',
    };
    return labels[role] || role;
  }

  /**
   * Obtient la description d'un rôle
   */
  public getroleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      [UserRole.USER]: 'Accès de base à la plateforme',
      [UserRole.CONTRIBUTOR]: 'Peut contribuer aux contenus',
      [UserRole.ADMIN]: 'Gestion avancée du système',
      [UserRole.SUPERADMIN]: 'Accès complet administrateur',
    };
    return descriptions[role] || '';
  }
}
