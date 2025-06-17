import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import {
  AdminUser,
  UserManagementData,
  UserRole,
} from '../../../../core/models/admin';

@Component({
  selector: 'app-user-management',
  standalone: false,
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: AdminUser[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  // Pagination
  currentPage = 1;
  totalPages = 0;
  totalUsers = 0;
  limit = 20;

  // Filtres
  filterForm: FormGroup;

  // Énumérations pour les templates
  UserRole = UserRole;
  statusOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'active', label: 'Actifs' },
    { value: 'suspended', label: 'Suspendus' },
  ];

  // Actions
  selectedUsers: Set<string> = new Set();
  actionInProgress = false;

  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      search: [''],
      role: [''],
      status: ['all'],
    });
  }

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions(): void {
    // Débounce de la recherche
    this.filterForm
      .get('search')
      ?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadUsers();
      });

    // Réaction immédiate aux changements de filtres
    this.filterForm
      .get('role')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadUsers();
      });

    this.filterForm
      .get('status')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadUsers();
      });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const filters = this.filterForm.value;

    this.adminService
      .getUsers(
        this.currentPage,
        this.limit,
        filters.role || undefined,
        filters.status === 'all' ? undefined : filters.status,
        filters.search || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: UserManagementData) => {
          this.users = data.users;
          this.totalUsers = data.total;
          this.totalPages = data.totalPages;
          this.isLoading = false;
          this.selectedUsers.clear();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des utilisateurs:', error);
          this.errorMessage = 'Erreur lors du chargement des utilisateurs';
          this.isLoading = false;
        },
      });
  }

  // === PAGINATION ===
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  // === SÉLECTION D'UTILISATEURS ===
  toggleUserSelection(userId: string): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  selectAllUsers(): void {
    if (this.selectedUsers.size === this.users.length) {
      this.selectedUsers.clear();
    } else {
      this.users.forEach((user) => this.selectedUsers.add(user._id));
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers.has(userId);
  }

  get allUsersSelected(): boolean {
    return (
      this.users.length > 0 && this.selectedUsers.size === this.users.length
    );
  }

  // === ACTIONS SUR LES UTILISATEURS ===
  async suspendUser(
    user: AdminUser,
    reason?: string,
    suspendUntil?: Date
  ): Promise<void> {
    if (this.actionInProgress) return;

    this.actionInProgress = true;

    try {
      const result = await this.adminService
        .toggleUserSuspension(user._id, true, reason, suspendUntil)
        .toPromise();

      if (result?.success) {
        user.isSuspended = true;
        user.suspensionReason = reason;
        user.suspendedUntil = suspendUntil;
      }
    } catch (error) {
      console.error('Erreur lors de la suspension:', error);
      this.errorMessage = "Erreur lors de la suspension de l'utilisateur";
    } finally {
      this.actionInProgress = false;
    }
  }

  async unsuspendUser(user: AdminUser): Promise<void> {
    if (this.actionInProgress) return;

    this.actionInProgress = true;

    try {
      const result = await this.adminService
        .toggleUserSuspension(user._id, false)
        .toPromise();

      if (result?.success) {
        user.isSuspended = false;
        user.suspensionReason = undefined;
        user.suspendedUntil = undefined;
      }
    } catch (error) {
      console.error('Erreur lors de la levée de suspension:', error);
      this.errorMessage = 'Erreur lors de la levée de suspension';
    } finally {
      this.actionInProgress = false;
    }
  }

  async changeUserRole(user: AdminUser, newRole: UserRole): Promise<void> {
    if (this.actionInProgress) return;

    this.actionInProgress = true;

    try {
      const result = await this.adminService
        .changeUserRole(user._id, newRole)
        .toPromise();

      if (result?.success) {
        user.role = newRole;
      }
    } catch (error) {
      console.error('Erreur lors du changement de rôle:', error);
      this.errorMessage = 'Erreur lors du changement de rôle';
    } finally {
      this.actionInProgress = false;
    }
  }

  openRoleChangeModal(user: AdminUser): void {
    if (this.actionInProgress) return;

    const roleOptions = [
      { value: UserRole.USER, label: 'Utilisateur' },
      { value: UserRole.CONTRIBUTOR, label: 'Contributeur' },
      { value: UserRole.ADMIN, label: 'Administrateur' },
      { value: UserRole.SUPERADMIN, label: 'Super Administrateur' },
    ];

    // Pour l'instant, utilisation d'un prompt simple
    // TODO: Remplacer par une vraie modal
    const currentRole = this.getRoleDisplayName(user.role);
    const roleChoices = roleOptions
      .map((option, index) => `${index + 1}. ${option.label}`)
      .join('\n');

    const choice = prompt(
      `Changer le rôle de ${user.username}\nRôle actuel: ${currentRole}\n\n${roleChoices}\n\nChoisissez un numéro (1-4):`
    );

    if (choice) {
      const roleIndex = parseInt(choice) - 1;
      if (roleIndex >= 0 && roleIndex < roleOptions.length) {
        const newRole = roleOptions[roleIndex].value;
        if (newRole !== user.role) {
          this.changeUserRole(user, newRole);
        }
      } else {
        alert('Choix invalide');
      }
    }
  }

  // === UTILITAIRES ===
  getRoleDisplayName(role: UserRole): string {
    const roleNames = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super Administrateur',
    };
    return roleNames[role] || 'Inconnu';
  }

  getRoleShortName(role: UserRole): string {
    const roleNames = {
      [UserRole.USER]: 'User',
      [UserRole.CONTRIBUTOR]: 'Contrib.',
      [UserRole.ADMIN]: 'Admin',
      [UserRole.SUPERADMIN]: 'S.Admin',
    };
    return roleNames[role] || 'Inconnu';
  }

  getRoleClass(role: UserRole): string {
    return `role-${role}`;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      role: '',
      status: 'all',
    });
  }

  refresh(): void {
    this.loadUsers();
  }

  // === GESTION DES ERREURS ===
  clearError(): void {
    this.errorMessage = null;
  }

  // === ACTIONS EN MASSE ===
  async suspendSelectedUsers(): Promise<void> {
    if (this.selectedUsers.size === 0 || this.actionInProgress) return;

    // Ici on pourrait ouvrir une modal pour demander la raison
    const reason = prompt('Raison de la suspension:');
    if (!reason) return;

    this.actionInProgress = true;

    const promises = Array.from(this.selectedUsers).map((userId) => {
      const user = this.users.find((u) => u._id === userId);
      return user ? this.suspendUser(user, reason) : Promise.resolve();
    });

    try {
      await Promise.all(promises);
      this.selectedUsers.clear();
    } finally {
      this.actionInProgress = false;
    }
  }

  // === MÉTHODES POUR LE TEMPLATE ===
  trackByUserId(index: number, user: AdminUser): string {
    return user._id;
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      // Si peu de pages, afficher toutes
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour afficher les pages avec ellipses
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, this.currentPage + halfVisible);

      // Ajuster si on est près du début ou de la fin
      if (this.currentPage <= halfVisible) {
        endPage = maxVisiblePages;
      } else if (this.currentPage > this.totalPages - halfVisible) {
        startPage = this.totalPages - maxVisiblePages + 1;
      }

      // Ajouter la première page et ellipse si nécessaire
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }

      // Ajouter les pages visibles
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Ajouter ellipse et dernière page si nécessaire
      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          pages.push('...');
        }
        pages.push(this.totalPages);
      }
    }

    return pages;
  }
}
