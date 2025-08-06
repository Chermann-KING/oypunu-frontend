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
import {
  User,
  UserRole,
  UserFilters,
  PaginatedResponse,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';
import { UserTableAction, UserTableSort } from '../../components/user-management/user-management-table.component';

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

  constructor(
    private readonly router: Router,
    private readonly adminApiService: AdminApiService,
    private readonly permissionService: PermissionService
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
    console.log('View user details:', userId);
  }

  public editUser(userId: string): void {
    console.log('Edit user:', userId);
  }

  /**
   * Export des utilisateurs
   */
  public exportUsers(): void {
    console.log('Export users');
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
    switch (action.type) {
      case 'view':
        this.viewUserDetails(action.user.id);
        break;
      case 'edit':
        this.editUser(action.user.id);
        break;
      case 'suspend':
        this.suspendUser(action.user.id);
        break;
      case 'activate':
        this.activateUser(action.user.id);
        break;
      case 'change_role':
        this.changeUserRole(action.user.id, action.payload?.newRole);
        break;
      case 'permissions':
        this.manageUserPermissions(action.user.id);
        break;
      case 'delete':
        this.deleteUser(action.user.id);
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
    if (confirm('Êtes-vous sûr de vouloir suspendre cet utilisateur ?')) {
      this.adminApiService.suspendUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Utilisateur suspendu:', userId);
            this.loadUsers(); // Recharger la liste
          },
          error: (error) => {
            console.error('Erreur lors de la suspension:', error);
          }
        });
    }
  }

  private activateUser(userId: string): void {
    this.adminApiService.reactivateUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Utilisateur activé:', userId);
          this.loadUsers(); // Recharger la liste
        },
        error: (error) => {
          console.error('Erreur lors de l\'activation:', error);
        }
      });
  }

  private changeUserRole(userId: string, newRole: UserRole): void {
    if (confirm(`Changer le rôle de cet utilisateur en ${newRole} ?`)) {
      this.adminApiService.updateUserRole(userId, newRole)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Rôle utilisateur changé:', userId, newRole);
            this.loadUsers(); // Recharger la liste
          },
          error: (error) => {
            console.error('Erreur lors du changement de rôle:', error);
          }
        });
    }
  }

  private manageUserPermissions(userId: string): void {
    // Navigation vers la page de gestion des permissions ou ouverture du modal
    this.router.navigate(['/admin/users', userId, 'permissions']);
  }

  private deleteUser(userId: string): void {
    if (confirm('ATTENTION: Cette action supprimera définitivement cet utilisateur. Continuer ?')) {
      this.adminApiService.deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Utilisateur supprimé:', userId);
            this.loadUsers(); // Recharger la liste
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
          }
        });
    }
  }

  // ===== ACTIONS EN LOT =====

  private bulkSuspendUsers(userIds: string[]): void {
    if (confirm(`Suspendre ${userIds.length} utilisateur(s) ?`)) {
      this.adminApiService.bulkSuspendUsers(userIds)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Utilisateurs suspendus:', userIds);
            this.loadUsers();
          },
          error: (error) => {
            console.error('Erreur lors de la suspension en lot:', error);
          }
        });
    }
  }

  private bulkActivateUsers(userIds: string[]): void {
    this.adminApiService.bulkReactivateUsers(userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Utilisateurs activés:', userIds);
          this.loadUsers();
        },
        error: (error) => {
          console.error('Erreur lors de l\'activation en lot:', error);
        }
      });
  }

  private bulkDeleteUsers(userIds: string[]): void {
    if (confirm(`ATTENTION: Supprimer définitivement ${userIds.length} utilisateur(s) ?`)) {
      this.adminApiService.bulkDeleteUsers(userIds)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Utilisateurs supprimés:', userIds);
            this.loadUsers();
          },
          error: (error) => {
            console.error('Erreur lors de la suppression en lot:', error);
          }
        });
    }
  }

  private exportSelectedUsers(userIds: string[]): void {
    this.adminApiService.exportUsers(userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Créer et télécharger le fichier CSV
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Erreur lors de l\'export:', error);
        }
      });
  }
}
