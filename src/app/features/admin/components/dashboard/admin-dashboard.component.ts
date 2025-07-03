import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { User } from '../../../../core/models/user';
import { AdminStats, UserRole } from '../../../../core/models/admin';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userRole: UserRole = UserRole.USER;
  dashboardStats: AdminStats | null = null;
  recentActivity: any = null;
  systemMetrics: any = null;
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Permissions pour l'affichage conditionnel (initialisées dans ngOnInit)
  canAccessUserManagement$!: Observable<boolean>;
  canAccessModeration$!: Observable<boolean>;
  canAccessCommunityManagement$!: Observable<boolean>;
  canAccessReports$!: Observable<boolean>;
  canAccessSystemSettings$!: Observable<boolean>;
  canAccessActivityLogs$!: Observable<boolean>;

  private subscriptions = new Subscription();

  // Référence pour l'enum dans le template
  UserRole = UserRole;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🚀 AdminDashboard: Initialisation du tableau de bord');

    // Vérifier les paramètres de succès
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'language-proposed') {
        this.successMessage = '🎉 Langue proposée avec succès ! Elle sera examinée par un administrateur.';
        // Effacer le message après 5 secondes
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
    });

    // Initialiser les observables de permissions
    this.canAccessUserManagement$ =
      this.permissionService.canAccessUserManagement();
    this.canAccessModeration$ = this.permissionService.canAccessModeration();
    this.canAccessCommunityManagement$ =
      this.permissionService.canAccessCommunityManagement();
    this.canAccessReports$ = this.permissionService.canAccessReports();
    this.canAccessSystemSettings$ =
      this.permissionService.canAccessSystemSettings();
    this.canAccessActivityLogs$ =
      this.permissionService.canAccessActivityLogs();

    this.loadUserData();
  }

  ngOnDestroy(): void {
    console.log('🔄 AdminDashboard: Nettoyage des subscriptions');
    this.subscriptions.unsubscribe();
  }

  private loadUserData(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = user;
            this.userRole = (user.role as UserRole) || UserRole.USER;
            console.log(
              '👤 AdminDashboard: Utilisateur chargé avec rôle:',
              this.userRole
            );
            this.loadDashboardData();
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement de l'utilisateur:", error);
          this.errorMessage =
            'Erreur lors du chargement des données utilisateur';
          this.isLoading = false;
        },
      })
    );
  }

  private loadDashboardData(): void {
    console.log(
      '📊 AdminDashboard: Chargement des données selon le rôle:',
      this.userRole
    );
    this.isLoading = true;
    this.errorMessage = '';

    // Charger les données selon le rôle de l'utilisateur
    switch (this.userRole) {
      case UserRole.CONTRIBUTOR:
        this.loadContributorDashboard();
        break;
      case UserRole.ADMIN:
        this.loadAdminDashboard();
        break;
      case UserRole.SUPERADMIN:
        this.loadSuperAdminDashboard();
        break;
      default:
        this.errorMessage =
          'Rôle non autorisé pour le tableau de bord administrateur';
        this.isLoading = false;
    }
  }

  private loadContributorDashboard(): void {
    console.log('🔧 AdminDashboard: Chargement du dashboard contributeur');
    this.subscriptions.add(
      this.adminService.getContributorDashboard().subscribe({
        next: (data) => {
          this.dashboardStats = {
            ...this.getEmptyStats(),
            ...data,
          };
          this.isLoading = false;
          console.log('✅ AdminDashboard: Dashboard contributeur chargé');
        },
        error: (error) => {
          console.error(
            '❌ Erreur lors du chargement du dashboard contributeur:',
            error
          );
          this.handleError(error);
        },
      })
    );
  }

  private loadAdminDashboard(): void {
    console.log('👔 AdminDashboard: Chargement du dashboard admin');
    this.subscriptions.add(
      this.adminService.getAdminDashboard().subscribe({
        next: (data) => {
          this.dashboardStats = data.stats || this.getEmptyStats();
          this.recentActivity = data.recentActivity || null;
          this.isLoading = false;
          console.log('✅ AdminDashboard: Dashboard admin chargé');
        },
        error: (error) => {
          console.error(
            '❌ Erreur lors du chargement du dashboard admin:',
            error
          );
          this.handleError(error);
        },
      })
    );
  }

  private loadSuperAdminDashboard(): void {
    console.log('👑 AdminDashboard: Chargement du dashboard superadmin');
    this.subscriptions.add(
      this.adminService.getSuperAdminDashboard().subscribe({
        next: (data) => {
          this.dashboardStats = data.stats || this.getEmptyStats();
          this.recentActivity = data.recentActivity || null;
          this.systemMetrics = data.systemHealth || null;
          this.isLoading = false;
          console.log('✅ AdminDashboard: Dashboard superadmin chargé');
        },
        error: (error) => {
          console.error(
            '❌ Erreur lors du chargement du dashboard superadmin:',
            error
          );
          this.handleError(error);
        },
      })
    );
  }

  private handleError(error: any): void {
    if (error.status === 403) {
      this.errorMessage =
        "Vous n'avez pas les permissions nécessaires pour accéder à ces données.";
    } else if (error.status === 401) {
      this.errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
    } else {
      this.errorMessage =
        'Erreur lors du chargement des données du tableau de bord.';
    }
    this.isLoading = false;
  }

  private getEmptyStats(): AdminStats {
    return {
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      totalWords: 0,
      pendingWords: 0,
      approvedWords: 0,
      rejectedWords: 0,
      totalCommunities: 0,
      activeCommunities: 0,
      totalPosts: 0,
      totalMessages: 0,
      newUsersThisMonth: 0,
      newWordsThisWeek: 0,
    };
  }

  // === ACTIONS ===
  refreshData(): void {
    console.log('🔄 AdminDashboard: Rafraîchissement des données');
    this.loadDashboardData();
  }

  clearError(): void {
    this.errorMessage = '';
  }

  // === NAVIGATION ===
  navigateToUserManagement(): void {
    // Cette navigation sera gérée par les routerLink dans le template
    console.log(
      '🔗 AdminDashboard: Navigation vers la gestion des utilisateurs'
    );
  }

  navigateToModeration(): void {
    console.log('🔗 AdminDashboard: Navigation vers la modération');
  }

  // === GETTERS POUR LE TEMPLATE ===
  get canAccessUserManagement(): boolean {
    return (
      this.userRole === UserRole.ADMIN || this.userRole === UserRole.SUPERADMIN
    );
  }

  get canAccessModeration(): boolean {
    return (
      this.userRole === UserRole.CONTRIBUTOR ||
      this.userRole === UserRole.ADMIN ||
      this.userRole === UserRole.SUPERADMIN
    );
  }

  get canAccessSystemMetrics(): boolean {
    return this.userRole === UserRole.SUPERADMIN;
  }

  get getUserInitials(): string {
    if (!this.currentUser) return '?';
    return this.currentUser.username.charAt(0).toUpperCase();
  }

  get getRoleDisplayName(): string {
    return this.permissionService.getRoleDisplayName(this.userRole);
  }

  get getRoleDescription(): string {
    return this.permissionService.getRoleDescription(this.userRole);
  }
}
