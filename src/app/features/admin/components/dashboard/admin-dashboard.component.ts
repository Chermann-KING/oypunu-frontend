import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ComprehensiveAdminService } from '../../services/comprehensive-admin.service';
import {
  AdminDashboardOverview,
  UserAnalyticsDetailed,
  ContentAnalyticsDetailed,
  CommunityAnalyticsDetailed,
  SystemMetricsDetailed,
  ActivityFeed,
  UserRole,
  AdminPermissions
} from '../../models/comprehensive-admin.models';
import { User } from '../../../../core/models/user';
import { ActionGroup } from '../action-button-group/action-button-group.component';
import { MetricData } from '../metric-card/metric-card.component';
import { SystemStatusData } from '../system-status/system-status.component';
import { QuickStat } from '../../models/dashboard.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userRole: UserRole = UserRole.USER;
  
  // Comprehensive dashboard data
  dashboardOverview: AdminDashboardOverview | null = null;
  userAnalytics: UserAnalyticsDetailed | null = null;
  contentAnalytics: ContentAnalyticsDetailed | null = null;
  communityAnalytics: CommunityAnalyticsDetailed | null = null;
  systemMetrics: SystemMetricsDetailed | null = null;
  activityFeed: ActivityFeed[] = [];
  userPermissions: AdminPermissions | null = null;
  
  selectedPeriod: '7d' | '30d' | '90d' | '1y' = '30d';
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // États de chargement pour chaque section
  loadingOverview = false;
  loadingUsers = false;
  loadingContent = false;
  loadingCommunities = false;
  loadingSystem = false;
  loadingActivity = false;

  private subscriptions = new Subscription();

  // Référence pour l'enum dans le template
  UserRole = UserRole;

  constructor(
    private authService: AuthService,
    private comprehensiveAdminService: ComprehensiveAdminService,
    private toastService: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Vérifier les paramètres de succès
    this.route.queryParams.subscribe((params) => {
      if (params['success'] === 'language-proposed') {
        this.toastService.success('Langue proposée avec succès ! Elle sera examinée par un administrateur.');
      }
    });

    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.comprehensiveAdminService.clearCache();
  }

  private loadUserData(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          if (user) {
            this.currentUser = user;
            this.userRole = (user.role as UserRole) || UserRole.USER;
            this.loadPermissions();
            this.loadDashboardData();
          }
        },
        error: (error) => {
          this.toastService.error('Erreur lors du chargement des données utilisateur');
          this.isLoading = false;
        },
      })
    );
  }

  private loadPermissions(): void {
    this.subscriptions.add(
      this.comprehensiveAdminService.getUserPermissions().subscribe({
        next: (permissions) => {
          this.userPermissions = permissions;
        },
        error: (error) => {
          this.toastService.error('Erreur lors du chargement des permissions');
        }
      })
    );
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Vérifier l'autorisation d'accès
    if (!this.hasMinimumRole(UserRole.CONTRIBUTOR)) {
      this.errorMessage = 'Accès non autorisé au tableau de bord administrateur';
      this.isLoading = false;
      return;
    }

    // Charger les données selon le rôle
    this.loadOverviewData();
    this.loadActivityFeed();
    
    if (this.hasMinimumRole(UserRole.ADMIN)) {
      this.loadAnalyticsData();
    }
    
    if (this.userRole === UserRole.SUPERADMIN) {
      this.loadSystemMetrics();
    }
  }

  private loadOverviewData(): void {
    this.loadingOverview = true;
    this.subscriptions.add(
      this.comprehensiveAdminService.getDashboardOverview().subscribe({
        next: (overview) => {
          this.dashboardOverview = overview;
          this.loadingOverview = false;
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError(error);
          this.loadingOverview = false;
        }
      })
    );
  }

  private loadActivityFeed(): void {
    this.loadingActivity = true;
    this.subscriptions.add(
      this.comprehensiveAdminService.getActivityFeed({ limit: 10 }).subscribe({
        next: (activities) => {
          this.activityFeed = activities;
          this.loadingActivity = false;
        },
        error: (error) => {
          this.toastService.error('Erreur lors du chargement des activités');
          this.loadingActivity = false;
        }
      })
    );
  }

  private loadAnalyticsData(): void {
    this.subscriptions.add(
      this.comprehensiveAdminService.getAllAnalytics(this.selectedPeriod).subscribe({
        next: (analytics) => {
          this.userAnalytics = analytics.users;
          this.contentAnalytics = analytics.content;
          this.communityAnalytics = analytics.communities;
          this.systemMetrics = analytics.system;
        },
        error: (error) => {
          this.toastService.error('Erreur lors du chargement des analytics');
        }
      })
    );
  }

  private loadSystemMetrics(): void {
    this.loadingSystem = true;
    this.subscriptions.add(
      this.comprehensiveAdminService.getSystemMetrics().subscribe({
        next: (metrics) => {
          this.systemMetrics = metrics;
          this.loadingSystem = false;
        },
        error: (error) => {
          this.toastService.error('Erreur lors du chargement des métriques système');
          this.loadingSystem = false;
        }
      })
    );
  }

  private handleError(error: any): void {
    if (error.status === 403) {
      this.errorMessage = "Vous n'avez pas les permissions nécessaires pour accéder à ces données.";
    } else if (error.status === 401) {
      this.errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
    } else {
      this.errorMessage = 'Erreur lors du chargement des données du tableau de bord.';
    }
    this.isLoading = false;
  }

  // === ACTIONS ===
  refreshData(): void {
    this.comprehensiveAdminService.refreshDashboard().subscribe({
      next: () => {
        this.loadDashboardData();
        this.toastService.success('Données rafraîchies avec succès');
      },
      error: (error) => {
        this.toastService.error('Erreur lors du rafraîchissement');
      }
    });
  }

  changePeriod(newPeriod: '7d' | '30d' | '90d' | '1y'): void {
    this.selectedPeriod = newPeriod;
    this.loadAnalyticsData();
  }

  refreshAnalytics(): void {
    this.loadAnalyticsData();
    this.toastService.success('Analytics rafraîchis');
  }

  clearError(): void {
    this.errorMessage = '';
  }

  // === UTILITY METHODS ===
  hasPermission(permission: keyof AdminPermissions): boolean {
    return this.userPermissions ? this.userPermissions[permission] : false;
  }

  hasMinimumRole(requiredRole: UserRole): boolean {
    return this.comprehensiveAdminService.hasMinimumRole(requiredRole, this.userRole);
  }

  // === GETTERS POUR LE TEMPLATE ===
  get canAccessUserManagement(): boolean {
    return this.hasPermission('canViewUsers');
  }

  get canAccessModeration(): boolean {
    return this.hasPermission('canModerateContent');
  }

  get canAccessSystemMetrics(): boolean {
    return this.hasPermission('canViewSystemMetrics');
  }

  get canAccessCommunities(): boolean {
    return this.hasPermission('canManageCommunities');
  }

  get canAccessReports(): boolean {
    return this.hasPermission('canExportData');
  }

  get getUserInitials(): string {
    if (!this.currentUser) return '?';
    return this.currentUser.username.charAt(0).toUpperCase();
  }

  get getRoleDisplayName(): string {
    const roleNames = {
      [UserRole.USER]: 'Utilisateur',
      [UserRole.CONTRIBUTOR]: 'Contributeur',
      [UserRole.ADMIN]: 'Administrateur',
      [UserRole.SUPERADMIN]: 'Super Administrateur'
    };
    return roleNames[this.userRole] || 'Inconnu';
  }

  get getRoleDescription(): string {
    const descriptions = {
      [UserRole.USER]: 'Accès basique à la plateforme',
      [UserRole.CONTRIBUTOR]: 'Peut modérer le contenu',
      [UserRole.ADMIN]: 'Gestion complète des utilisateurs et contenus',
      [UserRole.SUPERADMIN]: 'Accès total au système'
    };
    return descriptions[this.userRole] || 'Rôle inconnu';
  }

  // === MÉTHODES POUR LES NOUVEAUX COMPOSANTS ===

  // Méthodes pour les métriques avec calculs de croissance
  getUserGrowthRate(): number {
    if (!this.dashboardOverview) return 0;
    const baseValue = this.dashboardOverview.totalUsers || 1;
    const growth = this.dashboardOverview.newUsersToday || 0;
    return Math.round((growth / baseValue) * 100);
  }

  getUserGrowthType(): 'increase' | 'decrease' | 'neutral' {
    const rate = this.getUserGrowthRate();
    if (rate > 0) return 'increase';
    if (rate < 0) return 'decrease';
    return 'neutral';
  }

  getWordsGrowthRate(): number {
    if (!this.dashboardOverview) return 0;
    const baseValue = this.dashboardOverview.totalWords || 1;
    const growth = this.dashboardOverview.pendingWords || 0;
    return Math.round((growth / baseValue) * 100);
  }

  getWordsGrowthType(): 'increase' | 'decrease' | 'neutral' {
    const rate = this.getWordsGrowthRate();
    if (rate > 0) return 'increase';
    if (rate < 0) return 'decrease';
    return 'neutral';
  }

  getCommunitiesGrowthRate(): number {
    if (!this.dashboardOverview) return 0;
    const baseValue = this.dashboardOverview.totalCommunities || 1;
    const growth = this.dashboardOverview.activeCommunities || 0;
    return Math.round((growth / baseValue) * 100);
  }

  getCommunitiesGrowthType(): 'increase' | 'decrease' | 'neutral' {
    const rate = this.getCommunitiesGrowthRate();
    if (rate > 0) return 'increase';
    if (rate < 0) return 'decrease';
    return 'neutral';
  }

  getMessagesGrowthRate(): number {
    if (!this.dashboardOverview) return 0;
    // For messages, we'll use a simple growth indicator
    return 5; // Placeholder growth rate
  }

  getMessagesGrowthType(): 'increase' | 'decrease' | 'neutral' {
    const rate = this.getMessagesGrowthRate();
    if (rate > 0) return 'increase';
    if (rate < 0) return 'decrease';
    return 'neutral';
  }

  // Méthodes pour les actions groupées
  getActionGroups(): ActionGroup[] {
    const groups: ActionGroup[] = [];

    // Groupe Gestion selon le rôle
    if (this.userRole === UserRole.CONTRIBUTOR) {
      groups.push({
        title: 'Modération',
        actions: [
          {
            label: 'Modérer les mots',
            icon: 'moderation',
            route: '/admin/moderation',
            variant: 'primary',
            badge: this.dashboardOverview?.pendingWords
              ? {
                  value: this.dashboardOverview.pendingWords,
                  color: 'warning',
                }
              : undefined,
          },
          {
            label: 'Proposer une langue',
            icon: 'add',
            route: '/admin/languages/add',
            variant: 'secondary',
          },
        ],
      });
    }

    if (
      this.userRole === UserRole.ADMIN ||
      this.userRole === UserRole.SUPERADMIN
    ) {
      groups.push({
        title: 'Gestion',
        actions: [
          {
            label: 'Utilisateurs',
            icon: 'users',
            route: '/admin/users',
            variant: 'primary',
          },
          {
            label: 'Modération',
            icon: 'moderation',
            route: '/admin/moderation',
            variant: 'secondary',
            badge: this.dashboardOverview?.pendingWords
              ? {
                  value: this.dashboardOverview.pendingWords,
                  color: 'warning',
                }
              : undefined,
          },
          {
            label: 'Langues',
            icon: 'languages',
            route: '/admin/moderation/languages',
            variant: 'secondary',
          },
        ],
      });

      groups.push({
        title: 'Contenu',
        actions: [
          {
            label: 'Ajouter langue',
            icon: 'add',
            route: '/admin/languages/add',
            variant: 'success',
          },
          {
            label: 'Communautés',
            icon: 'communities',
            route: '/admin/communities',
            variant: 'ghost',
            disabled: true,
          },
        ],
      });
    }

    if (this.userRole === UserRole.SUPERADMIN) {
      groups.push({
        title: 'Administration',
        actions: [
          {
            label: 'Paramètres',
            icon: 'settings',
            route: '/admin/settings',
            variant: 'warning',
            disabled: true,
          },
          {
            label: 'Rapports',
            icon: 'reports',
            route: '/admin/reports',
            variant: 'ghost',
            disabled: true,
          },
          {
            label: 'Activité',
            icon: 'history',
            route: '/admin/activity',
            variant: 'ghost',
            disabled: true,
          },
        ],
      });
    }

    return groups;
  }

  // Méthodes pour le système status
  formatUptime(seconds: number): string {
    if (!seconds) return '0s';

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  getMemoryUsage(): number {
    if (!this.systemMetrics?.memoryUsage) return 0;
    return Math.round(this.systemMetrics.memoryUsage.percentage);
  }

  getSystemStatus(): 'healthy' | 'warning' | 'error' {
    if (!this.systemMetrics) return 'healthy';
    
    const memoryUsage = this.systemMetrics.memoryUsage.percentage;
    const errorRate = this.systemMetrics.apiMetrics.errorRate;
    const diskUsage = this.systemMetrics.diskUsage.percentage;

    if (memoryUsage > 90 || errorRate > 5 || diskUsage > 90) return 'error';
    if (memoryUsage > 70 || errorRate > 2 || diskUsage > 70) return 'warning';
    return 'healthy';
  }

  // Méthode pour les classes de rang contributeurs
  getRankClass(index: number): string {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return 'rank-other';
  }

  // === GETTERS POUR LES NOUVEAUX COMPOSANTS ===

  getUsersMetricData(): MetricData | null {
    if (!this.dashboardOverview) return null;

    const overview = this.dashboardOverview;
    return {
      value: overview.totalUsers || 0,
      label: 'Utilisateurs',
      sublabel: `${overview.activeUsers || 0} actifs`,
      icon: 'users',
      color: 'primary',
      change: {
        value: overview.newUsersToday || 0,
        period: 'aujourd\'hui',
        type: 'increase',
      },
    };
  }

  getWordsMetricData(): MetricData | null {
    if (!this.dashboardOverview) return null;

    const overview = this.dashboardOverview;
    return {
      value: overview.totalWords || 0,
      label: 'Mots',
      sublabel: `${overview.pendingWords || 0} en attente`,
      icon: 'words',
      color: 'secondary',
      change: {
        value: overview.approvedWords || 0,
        period: 'approuvés',
        type: 'increase',
      },
    };
  }

  getCommunitiesMetricData(): MetricData | null {
    if (!this.dashboardOverview) return null;

    const overview = this.dashboardOverview;
    return {
      value: overview.totalCommunities || 0,
      label: 'Communautés',
      sublabel: `${overview.activeCommunities || 0} actives`,
      icon: 'communities',
      color: 'info',
      change: {
        value: overview.totalLanguages || 0,
        period: 'langues',
        type: 'increase',
      },
    };
  }

  getMessagesMetricData(): MetricData | null {
    if (!this.dashboardOverview) return null;

    const overview = this.dashboardOverview;
    return {
      value: overview.totalContributorRequests || 0,
      label: 'Demandes',
      sublabel: `${overview.pendingContributorRequests || 0} en attente`,
      icon: 'messages',
      color: 'warning',
      change: {
        value: overview.pendingLanguages || 0,
        period: 'langues proposées',
        type: 'increase',
      },
    };
  }

  getSystemStatusData(): SystemStatusData | null {
    if (!this.systemMetrics) return null;

    return {
      status: this.getSystemStatus(),
      uptime: this.formatUptime(this.systemMetrics.uptime),
      nodeVersion: 'v18.x.x',
      memoryUsage: this.getMemoryUsage(),
      lastCheck: new Date(),
    };
  }

  // === MÉTHODES POUR LES QUICK STATS ===

  getUserGrowthQuickStats(): QuickStat[] {
    if (!this.userAnalytics) return [];

    return [
      {
        label: 'Utilisateurs totaux',
        value: this.userAnalytics.totalUsers || 0,
        period: 'total',
        trend: 'up',
      },
      {
        label: 'Utilisateurs actifs',
        value: this.userAnalytics.activeUsers.weekly || 0,
        period: 'cette semaine',
        trend: 'up',
      },
      {
        label: 'Taux de rétention J7',
        value: Math.round((this.userAnalytics.userRetention.day7 || 0) * 100),
        period: '%',
        trend: 'neutral',
      },
    ];
  }

  getLanguageDistributionQuickStats(): QuickStat[] {
    if (!this.contentAnalytics || !this.contentAnalytics.wordsByLanguage.length) return [];

    const topLanguage = this.contentAnalytics.wordsByLanguage[0];
    
    return [
      {
        label: 'Langues actives',
        value: this.contentAnalytics.wordsByLanguage.length || 0,
        period: 'total',
        trend: 'up',
      },
      {
        label: 'Langue principale',
        value: topLanguage.language.name || 'N/A',
        period: '',
        trend: 'neutral',
      },
      {
        label: 'Mots dans cette langue',
        value: topLanguage.count || 0,
        period: 'mots',
        trend: 'up',
      },
    ];
  }

  getContentGrowthQuickStats(): QuickStat[] {
    if (!this.contentAnalytics) return [];

    return [
      {
        label: 'Mots approuvés',
        value: this.contentAnalytics.wordsByStatus.approved || 0,
        period: 'approuvés',
        trend: 'up',
      },
      {
        label: 'Mots totaux',
        value: this.contentAnalytics.totalWords || 0,
        period: 'total',
        trend: 'up',
      },
      {
        label: 'Taux d\'approbation',
        value: Math.round((this.contentAnalytics.moderationMetrics.approvalRate || 0) * 100),
        period: '%',
        trend: 'neutral',
      },
    ];
  }

  getEngagementQuickStats(): QuickStat[] {
    if (!this.communityAnalytics) return [];

    return [
      {
        label: 'Membres totaux',
        value: this.communityAnalytics.membershipStats.totalMembers || 0,
        period: 'membres',
        trend: 'up',
      },
      {
        label: 'Communautés actives',
        value: this.communityAnalytics.activeCommunities || 0,
        period: 'actives',
        trend: 'up',
      },
      {
        label: 'Membres/communauté',
        value: Math.round(this.communityAnalytics.membershipStats.avgMembersPerCommunity || 0),
        period: 'moyenne',
        trend: 'up',
      },
    ];
  }

  getPerformanceQuickStats(): QuickStat[] {
    if (!this.systemMetrics) return [];

    return [
      {
        label: 'Temps de réponse',
        value: Math.round(this.systemMetrics.apiMetrics.avgResponseTime),
        period: 'ms',
        trend: 'down',
      },
      {
        label: 'Requêtes/min',
        value: this.systemMetrics.apiMetrics.requestsPerMinute || 0,
        period: 'req/min',
        trend: 'up',
      },
      {
        label: 'Taux d\'erreur',
        value: Math.round(this.systemMetrics.apiMetrics.errorRate * 100),
        period: '%',
        trend: 'neutral',
      },
    ];
  }

  // === GETTERS POUR GRAPHIQUES ===
  
  get userGrowthData() {
    return this.userAnalytics?.registrationTrends || [];
  }

  get contentGrowthData() {
    return this.contentAnalytics?.contentTrends || [];
  }

  get languageDistributionData() {
    return this.contentAnalytics?.wordsByLanguage || [];
  }

  get engagementData() {
    return this.communityAnalytics?.communityGrowth || [];
  }

  get performanceData() {
    return this.systemMetrics?.apiMetrics || null;
  }
}