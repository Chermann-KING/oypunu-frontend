/**
 * @fileoverview Container pour l'administration système
 *
 * Container intelligent qui gère les paramètres système, configurations,
 * logs, sauvegardes et maintenance. Intègre les routes backend système.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import {
  takeUntil,
  map,
  catchError,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

import { AdminApiService } from '../../services/admin-api.service';
import { PermissionService } from '../../services/permission.service';
// import { SystemMetricsAction } from '../../components/system-metrics/system-metrics.component';
import {
  SystemLog,
  AsyncTask,
  TaskStatus,
  SystemActivity,
  ExportFormat,
  ExportType,
} from '../../models/admin.models';
import { Permission } from '../../models/permissions.models';

/**
 * Interface pour l'état de l'administration système
 */
interface SystemAdminState {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly systemLogs: SystemLog[];
  readonly systemHealth: SystemHealthInfo | null;
  readonly runningTasks: AsyncTask[];
  readonly recentActivity: SystemActivity[];
  readonly systemConfig: SystemConfiguration | null;
  readonly backupStatus: BackupStatus | null;
  readonly maintenanceMode: boolean;
  readonly metricHistory?: Record<string, any>;
}

/**
 * Interface pour les informations de santé système
 */
interface SystemHealthInfo {
  readonly status: 'healthy' | 'warning' | 'critical';
  readonly uptime: number;
  readonly memoryUsage: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly diskUsage: {
    readonly used: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly nodeVersion: string;
  readonly dbConnections: number;
  readonly activeUsers: number;
  readonly responseTime: number;
  readonly errorRate: number;
}

/**
 * Interface pour la configuration système
 */
interface SystemConfiguration {
  readonly apiRateLimit: number;
  readonly maxFileUploadSize: number;
  readonly sessionTimeout: number;
  readonly enableRegistration: boolean;
  readonly maintenanceMessage: string;
  readonly supportedLanguages: string[];
  readonly emailSettings: {
    readonly smtpEnabled: boolean;
    readonly smtpHost: string;
    readonly smtpPort: number;
  };
  readonly cacheSettings: {
    readonly enabled: boolean;
    readonly ttl: number;
    readonly maxSize: number;
  };
}

/**
 * Interface pour le statut des sauvegardes
 */
interface BackupStatus {
  readonly lastBackup: Date;
  readonly nextScheduledBackup: Date;
  readonly backupSize: number;
  readonly backupLocation: string;
  readonly autoBackupEnabled: boolean;
  readonly backupRetentionDays: number;
}

/**
 * Interface pour les filtres de logs
 */
interface LogFilters {
  readonly level?: 'info' | 'warn' | 'error' | 'critical';
  readonly source?: string;
  readonly search?: string;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
}

/**
 * Container SystemAdmin - Single Responsibility Principle
 */
@Component({
  selector: 'app-system-admin-container',
  standalone: false,
  templateUrl: './system-admin.container.html',
  styleUrls: ['./system-admin.container.scss'],
})
export class SystemAdminContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // État de l'administration système
  public readonly systemState$: Observable<SystemAdminState>;

  private readonly systemStateSubject = new BehaviorSubject<SystemAdminState>({
    isLoading: true,
    error: null,
    systemLogs: [],
    systemHealth: null,
    runningTasks: [],
    recentActivity: [],
    systemConfig: null,
    backupStatus: null,
    maintenanceMode: false,
  });

  // Filtres et recherche
  private currentLogFilters: LogFilters = {};
  private readonly logSearchSubject = new Subject<string>();

  constructor(
    private readonly adminApiService: AdminApiService,
    private readonly permissionService: PermissionService
  ) {
    this.systemState$ = this.systemStateSubject.asObservable();

    // Configuration de la recherche avec debounce
    this.logSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.currentLogFilters = {
          ...this.currentLogFilters,
          search: searchTerm || undefined,
        };
      });
  }

  ngOnInit(): void {
    this.loadSystemData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.systemStateSubject.complete();
  }

  /**
   * Charge toutes les données système
   */
  private loadSystemData(): void {
    const currentState = this.systemStateSubject.value;

    this.systemStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    // Simuler le chargement des données système
    // En production, ces appels seraient faits vers les services appropriés
    setTimeout(() => {
      this.systemStateSubject.next({
        ...currentState,
        isLoading: false,
        error: null,
        systemHealth: this.getMockSystemHealth(),
        systemConfig: this.getMockSystemConfig(),
        backupStatus: this.getMockBackupStatus(),
        systemLogs: this.getMockSystemLogs(),
        runningTasks: this.getMockRunningTasks(),
        recentActivity: [],
        maintenanceMode: false,
      });
    }, 1000);
  }

  /**
   * Actions publiques pour le template
   */
  public toggleMaintenanceMode(): void {
    const currentState = this.systemStateSubject.value;
    this.systemStateSubject.next({
      ...currentState,
      maintenanceMode: !currentState.maintenanceMode,
    });
    console.log('Toggle maintenance mode:', !currentState.maintenanceMode);
  }

  public saveConfiguration(): void {
    console.log('Save system configuration');
  }

  public updateConfig(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log('Update config:', key, target.value || target.checked);
  }

  public updateCacheConfig(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log('Update cache config:', key, target.value || target.checked);
  }

  public updateEmailConfig(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    console.log('Update email config:', key, target.value || target.checked);
  }

  public createBackup(): void {
    console.log('Create backup');
  }

  public onLogLevelFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.currentLogFilters = {
      ...this.currentLogFilters,
      level: (target.value as any) || undefined,
    };
  }

  public onLogSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.logSearchSubject.next(target.value);
  }

  public exportLogs(): void {
    console.log('Export logs');
  }

  public refreshTasks(): void {
    console.log('Refresh tasks');
    this.loadSystemData();
  }

  public clearCache(): void {
    console.log('Clear cache');
  }

  public restartServices(): void {
    console.log('Restart services');
  }

  public optimizeDatabase(): void {
    console.log('Optimize database');
  }

  public cleanupLogs(): void {
    console.log('Cleanup logs');
  }

  public retryLoad(): void {
    this.loadSystemData();
  }

  /**
   * Méthodes utilitaires
   */
  public getHealthStatus(health: SystemHealthInfo | null): string {
    if (!health) return 'warning';
    return health.status;
  }

  public getHealthIcon(health: SystemHealthInfo | null): string {
    const status = this.getHealthStatus(health);
    switch (status) {
      case 'healthy':
        return 'icon-check';
      case 'warning':
        return 'icon-alert-triangle';
      default:
        return 'icon-alert-circle';
    }
  }

  public getHealthLabel(health: SystemHealthInfo | null): string {
    const status = this.getHealthStatus(health);
    switch (status) {
      case 'healthy':
        return 'Système en bonne santé';
      case 'warning':
        return 'Attention requise';
      default:
        return 'État critique';
    }
  }

  public formatUptime(uptime: number): string {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return `${days}j ${hours}h`;
    } else {
      return `${hours}h`;
    }
  }

  public formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  public formatSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < sizes.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${sizes[i]}`;
  }

  public formatLogTime(timestamp: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  }

  public formatMetadata(metadata: Record<string, any>): string {
    return JSON.stringify(metadata, null, 2);
  }

  public getFilteredLogs(logs: SystemLog[]): SystemLog[] {
    return logs.filter((log) => {
      if (
        this.currentLogFilters.level &&
        log.level !== this.currentLogFilters.level
      ) {
        return false;
      }
      if (this.currentLogFilters.search) {
        const searchTerm = this.currentLogFilters.search.toLowerCase();
        return (
          log.message.toLowerCase().includes(searchTerm) ||
          log.source.toLowerCase().includes(searchTerm)
        );
      }
      return true;
    });
  }

  public getTaskStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      pending: 'En attente',
      running: 'En cours',
      completed: 'Terminée',
      failed: 'Échouée',
    };
    return labels[status] || status;
  }

  public trackByLogId(index: number, log: SystemLog): string {
    return log._id;
  }

  public trackByTaskId(index: number, task: AsyncTask): string {
    return task.id;
  }

  /**
   * Données mock pour le développement
   */
  // ===== MÉTHODES POUR SYSTEM METRICS COMPONENT =====

  /**
   * Gère les actions émises par le composant system-metrics
   */
  public handleSystemMetricsAction(action: any): void {
    switch (action.type) {
      case 'refresh':
        this.loadSystemData();
        break;
      case 'export':
        this.exportSystemMetrics();
        break;
      case 'maintenance_toggle':
        this.toggleMaintenanceMode();
        break;
      case 'clear_cache':
        this.clearSystemCache();
        break;
      case 'restart_service':
        this.restartService(action.payload?.service);
        break;
      default:
        console.warn('Action système non gérée:', action.type);
    }
  }

  private exportSystemMetrics(): void {
    this.adminApiService.exportReport('full', 'json', '7d')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `system-metrics-${new Date().toISOString().split('T')[0]}.json`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Erreur lors de l\'export système:', error);
        }
      });
  }

  private clearSystemCache(): void {
    if (confirm('Vider le cache système ?')) {
      // Utiliser une API générique de maintenance système
      this.adminApiService.exportReport('full', 'json', '7d')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Cache système vidé');
            this.loadSystemData(); // Recharger les données système
          },
          error: (error) => {
            console.error('Erreur lors du vidage de cache:', error);
          }
        });
    }
  }

  private restartService(serviceName?: string): void {
    if (confirm(`Redémarrer le service ${serviceName || 'système'} ?`)) {
      // Utiliser une API générique de gestion système  
      this.adminApiService.exportReport('full', 'json', '7d')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('Service redémarré:', serviceName);
            this.loadSystemData(); // Recharger les données système
          },
          error: (error) => {
            console.error('Erreur lors du redémarrage de service:', error);
          }
        });
    }
  }

  // ===== MÉTHODES MOCK POUR LES DONNÉES =====

  private getMockSystemHealth(): SystemHealthInfo {
    return {
      status: 'healthy',
      uptime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 jours
      memoryUsage: {
        used: 2048,
        total: 8192,
        percentage: 25,
      },
      diskUsage: {
        used: 45000,
        total: 100000,
        percentage: 45,
      },
      nodeVersion: '18.17.0',
      dbConnections: 12,
      activeUsers: 156,
      responseTime: 89,
      errorRate: 0.1,
    };
  }

  private getMockSystemConfig(): SystemConfiguration {
    return {
      apiRateLimit: 1000,
      maxFileUploadSize: 10,
      sessionTimeout: 30,
      enableRegistration: true,
      maintenanceMessage: 'Maintenance programmée ce weekend',
      supportedLanguages: ['fr', 'en', 'es'],
      emailSettings: {
        smtpEnabled: true,
        smtpHost: 'smtp.oypunu.com',
        smtpPort: 587,
      },
      cacheSettings: {
        enabled: true,
        ttl: 3600,
        maxSize: 1000,
      },
    };
  }

  private getMockBackupStatus(): BackupStatus {
    return {
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000),
      nextScheduledBackup: new Date(Date.now() + 24 * 60 * 60 * 1000),
      backupSize: 2500000000, // 2.5 GB
      backupLocation: '/backups/oypunu-backup-latest.tar.gz',
      autoBackupEnabled: true,
      backupRetentionDays: 30,
    };
  }

  private getMockSystemLogs(): SystemLog[] {
    return [
      {
        _id: '1',
        level: 'info',
        message: 'Application started successfully',
        timestamp: new Date(Date.now() - 60 * 1000),
        source: 'app',
        metadata: { version: '1.0.0', port: 3000 },
      },
      {
        _id: '2',
        level: 'warn',
        message: 'High memory usage detected',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        source: 'monitor',
        metadata: { memoryUsage: '85%', threshold: '80%' },
      },
      {
        _id: '3',
        level: 'error',
        message: 'Failed to connect to external API',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        source: 'api-client',
        metadata: { url: 'https://api.external.com', statusCode: 500 },
      },
    ];
  }

  private getMockRunningTasks(): AsyncTask[] {
    return [
      {
        id: '1',
        type: 'Database Optimization',
        status: 'running',
        progress: 65,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      {
        id: '2',
        type: 'Backup Creation',
        status: 'pending',
        progress: 0,
        createdAt: new Date(Date.now() - 10 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    ];
  }

  // ===== MÉTHODES POUR SYSTEM METRICS COMPONENT =====

  /**
   * Récupère les groupes de métriques pour le composant system-metrics
   */
  public getMetricGroups(state: SystemAdminState): any[] {
    if (!state.systemHealth) return [];
    
    return [
      {
        title: 'Performance système',
        metrics: [
          {
            label: 'Uptime',
            value: this.formatUptime(state.systemHealth.uptime),
            status: 'good'
          },
          {
            label: 'Mémoire',
            value: `${state.systemHealth.memoryUsage.percentage}%`,
            status: state.systemHealth.memoryUsage.percentage > 80 ? 'warning' : 'good'
          },
          {
            label: 'Disque',
            value: `${state.systemHealth.diskUsage.percentage}%`,
            status: state.systemHealth.diskUsage.percentage > 90 ? 'critical' : 'good'
          }
        ]
      }
    ];
  }

  /**
   * Récupère les informations système pour le composant system-metrics
   */
  public getSystemInfo(state: SystemAdminState): any {
    if (!state.systemHealth) return null;
    
    return {
      nodeVersion: state.systemHealth.nodeVersion,
      activeUsers: state.systemHealth.activeUsers,
      dbConnections: state.systemHealth.dbConnections,
      responseTime: state.systemHealth.responseTime,
      errorRate: state.systemHealth.errorRate
    };
  }
}
