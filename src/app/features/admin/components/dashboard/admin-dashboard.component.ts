import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, Observable, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../services/permission.service';
import {
  AnalyticsService,
  UserAnalytics,
  ContentAnalytics,
  CommunityAnalytics,
  SystemMetrics,
  TimePeriod,
} from '../../services/analytics.service';
import { User } from '../../../../core/models/user';
import { AdminStats, UserRole } from '../../../../core/models/admin';

// ===============================================
// 🆕 NOUVEAUX IMPORTS POUR LES COMPOSANTS
// ===============================================
// 🆕 IMPORTS POUR LES COMPOSANTS
// ===============================================
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
  dashboardStats: AdminStats | null = null;
  recentActivity: any = null;
  systemMetrics: any = null;
  isLoading = true;
  errorMessage = '';
  successMessage = '';

  // Nouvelles données analytics
  userAnalytics: UserAnalytics | null = null;
  contentAnalytics: ContentAnalytics | null = null;
  communityAnalytics: CommunityAnalytics | null = null;
  systemMetricsData: SystemMetrics | null = null;
  selectedPeriod: TimePeriod = '30d';

  // États de chargement pour chaque section
  loadingUsers = false;
  loadingContent = false;
  loadingCommunities = false;
  loadingSystem = false;

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
    private analyticsService: AnalyticsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🚀 AdminDashboard: Initialisation du tableau de bord');

    // Vérifier les paramètres de succès
    this.route.queryParams.subscribe((params) => {
      if (params['success'] === 'language-proposed') {
        this.successMessage =
          '🎉 Langue proposée avec succès ! Elle sera examinée par un administrateur.';
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
          console.log(
            '✅ AdminDashboard: Dashboard contributeur chargé',
            this.dashboardStats
          );
          this.isLoading = false;
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

    // Charger les analytics avancées pour les superadmins
    this.loadAdvancedAnalytics();
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

  // === ANALYTICS AVANCÉES ===

  private loadAdvancedAnalytics(): void {
    console.log('📊 AdminDashboard: Chargement des analytics avancées');

    // Charger tous les analytics en parallèle
    this.loadUserAnalytics();
    this.loadContentAnalytics();
    this.loadCommunityAnalytics();
    this.loadSystemMetrics();
  }

  loadUserAnalytics(): void {
    this.loadingUsers = true;
    this.subscriptions.add(
      this.analyticsService.getUserAnalytics(this.selectedPeriod).subscribe({
        next: (data) => {
          this.userAnalytics = data;
          this.loadingUsers = false;
          console.log('✅ Analytics utilisateurs chargées');
        },
        error: (error) => {
          console.error('❌ Erreur analytics utilisateurs:', error);
          this.loadingUsers = false;
        },
      })
    );
  }

  loadContentAnalytics(): void {
    this.loadingContent = true;
    this.subscriptions.add(
      this.analyticsService.getContentAnalytics().subscribe({
        next: (data) => {
          this.contentAnalytics = data;
          this.loadingContent = false;
          console.log('✅ Analytics contenu chargées');
        },
        error: (error) => {
          console.error('❌ Erreur analytics contenu:', error);
          this.loadingContent = false;
        },
      })
    );
  }

  loadCommunityAnalytics(): void {
    this.loadingCommunities = true;
    this.subscriptions.add(
      this.analyticsService.getCommunityAnalytics().subscribe({
        next: (data) => {
          this.communityAnalytics = data;
          this.loadingCommunities = false;
          console.log('✅ Analytics communautés chargées');
        },
        error: (error) => {
          console.error('❌ Erreur analytics communautés:', error);
          this.loadingCommunities = false;
        },
      })
    );
  }

  loadSystemMetrics(): void {
    this.loadingSystem = true;
    this.subscriptions.add(
      this.analyticsService.getSystemMetrics().subscribe({
        next: (data) => {
          this.systemMetricsData = data;
          this.loadingSystem = false;
          console.log('✅ Métriques système chargées');
        },
        error: (error) => {
          console.error('❌ Erreur métriques système:', error);
          this.loadingSystem = false;
        },
      })
    );
  }

  // === GETTERS POUR GRAPHIQUES ===

  get userGrowthChartData() {
    return this.userAnalytics
      ? this.analyticsService.formatUserGrowthData(this.userAnalytics)
      : null;
  }

  get contentGrowthChartData() {
    return this.contentAnalytics
      ? this.analyticsService.formatContentGrowthData(this.contentAnalytics)
      : null;
  }

  get languageDistributionChartData() {
    return this.contentAnalytics
      ? this.analyticsService.formatLanguageDistributionData(
          this.contentAnalytics
        )
      : null;
  }

  get languageDistributionData() {
    return this.languageDistributionChartData?.series || [];
  }

  get languageDistributionLabels() {
    return this.languageDistributionChartData?.labels || [];
  }

  get contentGrowthData() {
    return this.contentGrowthChartData?.series || [];
  }

  get contentGrowthCategories() {
    return this.contentGrowthChartData?.categories || [];
  }

  get engagementData() {
    return this.engagementChartData?.series || [];
  }

  get engagementCategories() {
    return this.engagementChartData?.categories || [];
  }

  get performanceData() {
    return this.performanceChartData?.series || [];
  }

  get performanceCategories() {
    return this.performanceChartData?.categories || [];
  }

  get userGrowthData() {
    return this.userGrowthChartData?.series || [];
  }

  get userGrowthCategories() {
    return this.userGrowthChartData?.categories || [];
  }

  get engagementChartData() {
    return this.communityAnalytics
      ? this.analyticsService.formatEngagementData(this.communityAnalytics)
      : null;
  }

  get performanceChartData() {
    return this.systemMetricsData
      ? this.analyticsService.formatPerformanceData(this.systemMetricsData)
      : null;
  }

  // === ACTIONS ===
  refreshData(): void {
    console.log('🔄 AdminDashboard: Rafraîchissement des données');
    this.loadDashboardData();
  }

  changePeriod(newPeriod: TimePeriod): void {
    console.log('📅 AdminDashboard: Changement de période:', newPeriod);
    this.selectedPeriod = newPeriod;
    this.loadUserAnalytics();
  }

  refreshAnalytics(): void {
    console.log('🔄 AdminDashboard: Rafraîchissement des analytics');
    this.analyticsService.refreshAllAnalytics(this.selectedPeriod);
    this.loadAdvancedAnalytics();
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

  // ===============================================
  // 🎯 MÉTHODES POUR LES NOUVEAUX COMPOSANTS
  // ===============================================

  // Méthodes pour les métriques avec calculs de croissance
  getUserGrowthRate(): number {
    if (!this.dashboardStats) return 0;
    const baseValue = this.dashboardStats.totalUsers || 1;
    const growth = this.dashboardStats.newUsersThisMonth || 0;
    return Math.round((growth / baseValue) * 100);
  }

  getUserGrowthType(): 'increase' | 'decrease' | 'neutral' {
    const rate = this.getUserGrowthRate();
    if (rate > 0) return 'increase';
    if (rate < 0) return 'decrease';
    return 'neutral';
  }

  getWordsGrowthRate(): number {
    if (!this.dashboardStats) return 0;
    const baseValue = this.dashboardStats.totalWords || 1;
    const growth = this.dashboardStats.newWordsThisWeek || 0;
    return Math.round((growth / baseValue) * 100);
  }

  getWordsGrowthType(): 'increase' | 'decrease' | 'neutral' {
    const rate = this.getWordsGrowthRate();
    if (rate > 0) return 'increase';
    if (rate < 0) return 'decrease';
    return 'neutral';
  }

  getCommunitiesGrowthRate(): number {
    if (!this.dashboardStats) return 0;
    // Simulation - dans un vrai cas, on aurait ces données du backend
    return Math.floor(Math.random() * 20) + 5;
  }

  getCommunitiesGrowthType(): 'increase' | 'decrease' | 'neutral' {
    return 'increase'; // Simulé positivement
  }

  getMessagesGrowthRate(): number {
    if (!this.dashboardStats) return 0;
    // Simulation basée sur l'activité
    return Math.floor(Math.random() * 15) + 2;
  }

  getMessagesGrowthType(): 'increase' | 'decrease' | 'neutral' {
    return 'increase'; // Simulé positivement
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
            badge: this.dashboardStats?.pendingWords
              ? {
                  value: this.dashboardStats.pendingWords,
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
            badge: this.dashboardStats?.pendingWords
              ? {
                  value: this.dashboardStats.pendingWords,
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
    if (!this.systemMetricsData?.memoryUsage) return 0;
    return Math.round(this.systemMetricsData.memoryUsage);
  }

  getSystemStatus(): 'healthy' | 'warning' | 'error' {
    const memoryUsage = this.getMemoryUsage();
    const errorRate = this.systemMetricsData?.errorRate || 0;

    if (memoryUsage > 500 || errorRate > 0.1) return 'warning';
    if (memoryUsage > 1000 || errorRate > 0.2) return 'error';
    return 'healthy';
  }

  // Méthode pour les classes de rang contributeurs
  getRankClass(index: number): string {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return 'rank-other';
  }

  // ===============================================
  // 🆕 GETTERS POUR LES NOUVEAUX COMPOSANTS
  // ===============================================

  getUsersMetricData(): MetricData | null {
    if (!this.dashboardStats) return null;

    return {
      value: this.dashboardStats.totalUsers || 0,
      label: 'Utilisateurs',
      sublabel: `${this.dashboardStats.activeUsers || 0} actifs`,
      icon: 'users',
      color: 'primary',
      change: {
        value: this.dashboardStats.newUsersThisMonth || 0,
        period: 'ce mois',
        type: 'increase',
      },
    };
  }

  getWordsMetricData(): MetricData | null {
    if (!this.dashboardStats) return null;

    return {
      value: this.dashboardStats.totalWords || 0,
      label: 'Mots',
      sublabel: `${this.dashboardStats.pendingWords || 0} en attente`,
      icon: 'words',
      color: 'secondary',
      change: {
        value: this.dashboardStats.newWordsThisWeek || 0,
        period: 'cette semaine',
        type: 'increase',
      },
    };
  }

  getCommunitiesMetricData(): MetricData | null {
    if (!this.dashboardStats) return null;

    return {
      value: this.dashboardStats.totalCommunities || 0,
      label: 'Communautés',
      sublabel: `${this.dashboardStats.activeCommunities || 0} actives`,
      icon: 'communities',
      color: 'info',
      change: {
        value: 0,
        period: 'ce mois',
        type: 'neutral',
      },
    };
  }

  getMessagesMetricData(): MetricData | null {
    if (!this.dashboardStats) return null;

    return {
      value: this.dashboardStats.totalMessages || 0,
      label: 'Messages',
      sublabel: `${this.dashboardStats.totalPosts || 0} posts`,
      icon: 'messages',
      color: 'warning',
      change: {
        value: 0,
        period: "aujourd'hui",
        type: 'neutral',
      },
    };
  }

  // === MÉTHODES MANQUANTES POUR LES QUICK STATS ===

  getSystemStatusData(): SystemStatusData | null {
    if (!this.systemMetricsData) return null;

    return {
      status: this.getSystemStatus(),
      uptime: this.systemMetricsData.serverUptime || 'N/A',
      nodeVersion: 'v18.x.x', // Valeur par défaut, à récupérer du backend
      memoryUsage: this.getMemoryUsage(),
      lastCheck: new Date(),
    };
  }

  getUserGrowthQuickStats(): QuickStat[] {
    if (!this.userAnalytics) return [];

    return [
      {
        label: 'Nouveaux utilisateurs',
        value: this.userAnalytics.newUsersThisMonth || 0,
        period: 'ce mois',
        trend: 'up',
      },
      {
        label: 'Utilisateurs actifs',
        value: this.userAnalytics.activeUsers || 0,
        period: 'cette semaine',
        trend: 'up',
      },
      {
        label: 'Taux de croissance',
        value: Math.round((this.userAnalytics.userGrowthRate || 0) * 100),
        period: '%',
        trend: 'neutral',
      },
    ];
  }

  getLanguageDistributionQuickStats(): QuickStat[] {
    if (!this.contentAnalytics) return [];

    const topLanguage = this.contentAnalytics.wordsByLanguage?.[0];
    
    return [
      {
        label: 'Langues actives',
        value: this.contentAnalytics.wordsByLanguage?.length || 0,
        period: 'total',
        trend: 'up',
      },
      {
        label: 'Langue principale',
        value: topLanguage?.language || 'N/A',
        period: '',
        trend: 'neutral',
      },
      {
        label: 'Couverture',
        value: Math.round(topLanguage?.percentage || 0),
        period: '%',
        trend: 'up',
      },
    ];
  }

  getContentGrowthQuickStats(): QuickStat[] {
    if (!this.contentAnalytics) return [];

    const totalWords = this.contentAnalytics.wordsByStatus.approved + 
                      this.contentAnalytics.wordsByStatus.pending + 
                      this.contentAnalytics.wordsByStatus.rejected;
    const approvalRate = totalWords > 0 ? 
                        (this.contentAnalytics.wordsByStatus.approved / totalWords) * 100 : 0;

    return [
      {
        label: 'Nouveaux mots',
        value: this.contentAnalytics.wordsThisWeek || 0,
        period: 'cette semaine',
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
        value: Math.round(approvalRate),
        period: '%',
        trend: 'neutral',
      },
    ];
  }

  getEngagementQuickStats(): QuickStat[] {
    if (!this.communityAnalytics) return [];

    return [
      {
        label: 'Posts actifs',
        value: this.communityAnalytics.postsThisWeek || 0,
        period: 'cette semaine',
        trend: 'up',
      },
      {
        label: 'Communautés actives',
        value: this.communityAnalytics.activeCommunities || 0,
        period: 'total',
        trend: 'up',
      },
      {
        label: 'Posts aujourd\'hui',
        value: this.communityAnalytics.postsToday || 0,
        period: 'aujourd\'hui',
        trend: 'neutral',
      },
    ];
  }

  getPerformanceQuickStats(): QuickStat[] {
    if (!this.systemMetricsData) return [];

    return [
      {
        label: 'Temps de réponse',
        value: Math.round(this.systemMetricsData.averageResponseTime || 0),
        period: 'ms',
        trend: 'down',
      },
      {
        label: 'Requêtes totales',
        value: this.systemMetricsData.totalRequests || 0,
        period: 'total',
        trend: 'up',
      },
      {
        label: 'Taux d\'erreur',
        value: Math.round((this.systemMetricsData.errorRate || 0) * 100),
        period: '%',
        trend: 'neutral',
      },
    ];
  }
}
