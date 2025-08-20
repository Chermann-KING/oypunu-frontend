/**
 * @fileoverview Composant présentationnel User Management Table - SOLID Principles
 *
 * Composant pur qui affiche une table des utilisateurs avec actions.
 * Ne contient aucune logique métier, uniquement la présentation.
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
  NgModule,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserRole, UserFilters } from '../../models/admin.models';
import { DropdownService } from '../../services/dropdown.service';
import { Observable } from 'rxjs';

/**
 * Interface pour les actions sur les utilisateurs
 */
export interface UserTableAction {
  readonly type:
    | 'view'
    | 'edit'
    | 'suspend'
    | 'activate'
    | 'change_role'
    | 'permissions'
    | 'delete'
    | 'export';
  readonly user: User;
  readonly payload?: any;
}

/**
 * Interface pour les événements de tri
 */
export interface UserTableSort {
  readonly column: 'username' | 'email' | 'role' | 'createdAt' | 'lastLogin';
  readonly direction: 'asc' | 'desc';
}

/**
 * Interface pour la pagination
 */
export interface UserTablePagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

/**
 * Composant UserManagementTable - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher les utilisateurs dans une table avec actions
 */
@Component({
  selector: 'app-user-management-table',
  standalone: false,
  templateUrl: './user-management-table.component.html',
  styleUrls: ['./user-management-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementTableComponent implements OnDestroy {
  // ===== INPUTS =====

  @Input() users: User[] | null = null;
  @Input() selectedUsers: string[] = [];
  @Input() pagination: UserTablePagination | null = null;
  @Input() filters: UserFilters | null = null;
  @Input() sort: UserTableSort | null = null;
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;
  @Input() showFilters: boolean = true;

  // ===== OUTPUTS =====

  @Output() actionClicked = new EventEmitter<UserTableAction>();
  @Output() bulkActionClicked = new EventEmitter<{
    type: string;
    users: string[];
  }>();
  @Output() selectionChanged = new EventEmitter<string[]>();
  @Output() sortChanged = new EventEmitter<UserTableSort>();
  @Output() filterChanged = new EventEmitter<UserFilters>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() refreshRequested = new EventEmitter<void>();

  // ===== PROPRIÉTÉS INTERNES =====

  public openDropdownId: string | null = null; // ID du dropdown actuellement ouvert

  constructor(
    private dropdownService: DropdownService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnDestroy(): void {
    // Rien à nettoyer
  }

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Gestion des actions sur un utilisateur
   */
  public onAction(
    type: UserTableAction['type'],
    user: User | null,
    payload?: any
  ): void {
    if (!user && type !== 'export') return;
    
    // Fermer le dropdown après l'action
    this.openDropdownId = null;
    
    this.actionClicked.emit({ type, user: user!, payload });
  }

  /**
   * Gestion des actions en lot
   */
  public onBulkAction(type: string): void {
    if (this.selectedUsers.length === 0) return;

    this.bulkActionClicked.emit({
      type,
      users: [...this.selectedUsers],
    });
  }

  /**
   * Sélection de tous les utilisateurs
   */
  public onSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newSelection = target.checked
      ? this.users?.map((user) => user.id) || []
      : [];

    this.selectionChanged.emit(newSelection);
  }

  /**
   * Sélection d'un utilisateur individuel
   */
  public onSelectUser(userId: string, event: Event): void {
    if (!userId) return; // Sécurité si userId est undefined
    
    const target = event.target as HTMLInputElement;
    const newSelection = target.checked
      ? [...this.selectedUsers, userId]
      : this.selectedUsers.filter((id) => id !== userId);

    this.selectionChanged.emit(newSelection);
  }

  /**
   * Tri par colonne
   */
  public onSort(column: UserTableSort['column']): void {
    const currentSort = this.sort;
    const direction =
      currentSort?.column === column && currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';

    this.sortChanged.emit({ column, direction });
  }

  /**
   * Changement de filtre
   */
  public onFilterChange(field: keyof UserFilters, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value || undefined;

    const newFilters = {
      ...this.filters,
      [field]: value,
    };

    this.filterChanged.emit(newFilters);
  }

  /**
   * Effacement des filtres
   */
  public onClearFilters(): void {
    this.filterChanged.emit({});
  }

  /**
   * Changement de page
   */
  public onPageChange(page: number): void {
    this.pageChanged.emit(page);
  }

  /**
   * Actualisation
   */
  public onRefresh(): void {
    this.refreshRequested.emit();
  }

  /**
   * Toggle dropdown menu
   */
  public toggleDropdown(event: Event, userId: string): void {
    if (!userId) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Simple logique: si c'est déjà ouvert, fermer, sinon ouvrir
    this.openDropdownId = this.openDropdownId === userId ? null : userId;
    console.log('🔧 DEBUG: openDropdownId maintenant:', this.openDropdownId);
  }

  /**
   * Host listener pour fermer le dropdown au clic extérieur
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.openDropdownId && !this.elementRef.nativeElement.contains(event.target)) {
      this.openDropdownId = null;
      console.log('🔧 DEBUG: Dropdown fermé par clic extérieur');
    }
  }


  /**
   * Vérifie si un dropdown est ouvert
   */
  public isDropdownOpen(userId: string): boolean {
    const isOpen = this.openDropdownId === userId;
    console.log('🔧 DEBUG: isDropdownOpen pour', userId, ':', isOpen);
    return isOpen;
  }

  /**
   * Vérifie si tous les utilisateurs sont sélectionnés
   */
  public isAllSelected(): boolean {
    return !!(
      this.users &&
      this.users.length > 0 &&
      this.selectedUsers.length === this.users.length
    );
  }

  /**
   * Vérifie si la sélection est partielle
   */
  public isPartiallySelected(): boolean {
    return (
      this.selectedUsers.length > 0 &&
      this.selectedUsers.length < (this.users?.length || 0)
    );
  }

  /**
   * Vérifie si un utilisateur est sélectionné
   */
  public isUserSelected(userId: string): boolean {
    return this.selectedUsers.includes(userId);
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  public hasActiveFilters(): boolean {
    return !!(
      this.filters?.role ||
      this.filters?.status ||
      this.filters?.search
    );
  }

  /**
   * Obtient l'icône de tri pour une colonne
   */
  public getSortIcon(column: string): string {
    if (this.sort?.column !== column) {
      return 'icon-chevron-up-down';
    }
    return this.sort.direction === 'asc'
      ? 'icon-chevron-up'
      : 'icon-chevron-down';
  }

  /**
   * TrackBy function pour optimiser les performances
   */
  public trackByUserId(index: number, user: User): string {
    return user.id || user._id;
  }

  /**
   * Obtient les initiales d'un utilisateur
   */
  public getUserInitials(user: User): string {
    const firstName = user.firstName || user.username.charAt(0);
    const lastName = user.lastName || user.username.charAt(1) || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

  /**
   * Obtient le libellé du rôle
   */
  public getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      user: 'Utilisateur',
      contributor: 'Contributeur',
      admin: 'Admin',
      superadmin: 'Super Admin',
    };
    return labels[role] || role;
  }

  /**
   * Obtient le libellé du statut
   */
  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Actif',
      suspended: 'Suspendu',
      banned: 'Banni',
    };
    return labels[status] || status;
  }

  /**
   * Obtient l'icône du statut
   */
  public getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      active: 'icon-check-circle',
      suspended: 'icon-pause-circle',
      banned: 'icon-x-circle',
    };
    return icons[status] || 'icon-help-circle';
  }

  /**
   * Formate une date
   */
  public formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  /**
   * Obtient la plage d'affichage pour la pagination
   */
  public getDisplayRange(): string {
    if (!this.pagination) return '';

    const start = (this.pagination.page - 1) * this.pagination.pageSize + 1;
    const end = Math.min(
      this.pagination.page * this.pagination.pageSize,
      this.pagination.total
    );

    return `${start}-${end}`;
  }

  /**
   * Obtient le nombre total de pages
   */
  public getTotalPages(): number {
    if (!this.pagination) return 1;
    return Math.ceil(this.pagination.total / this.pagination.pageSize);
  }

  /**
   * Obtient les pages visibles pour la pagination
   */
  public getVisiblePages(): number[] {
    if (!this.pagination) return [1];

    const totalPages = this.getTotalPages();
    const currentPage = this.pagination.page;
    const pages: number[] = [];

    // Logique simple pour afficher 5 pages max autour de la page courante
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}
