/**
 * @fileoverview Module Admin principal - Architecture NgModule (No-Standalone)
 *
 * Module Angular qui encapsule toutes les fonctionnalités d'administration.
 * Respecte les principes SOLID et l'architecture modulaire Angular 19.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Modules externes
import { NgApexchartsModule } from 'ng-apexcharts';

// Modules internes
import { SharedModule } from '../../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';

// Environnement
import { environment } from '../../../environments/environment';

// Services
import { AdminApiService } from './services/admin-api.service';
import { AnalyticsApiService } from './services/analytics-api.service';
import { PermissionService } from './services/permission.service';

// Guards
import { PermissionGuard } from './guards/permission.guard';

// Directives
import {
  HasPermissionDirective,
  HasRoleDirective,
  HasPermissionElseDirective,
} from './directives';

// Containers (Smart Components)
import { AdminDashboardContainer } from './containers/admin-dashboard/admin-dashboard.container';
import { UserAdminContainer } from './containers/user-admin/user-admin.container';
import { ContentModerationContainer } from './containers/content-moderation/content-moderation.container';
import { AnalyticsOverviewContainer } from './containers/analytics-overview/analytics-overview.container';
import { SystemAdminContainer } from './containers/system-admin/system-admin.container';

// Components (Presentational Components)
import { DashboardStatsComponent } from './components/dashboard/dashboard-stats.component';
import { UserManagementTableComponent } from './components/user-management/user-management-table.component';
import { UserPermissionsModalComponent } from './components/user-management/user-permissions-modal.component';
import { AnalyticsChartComponent } from './components/analytics-charts/analytics-chart.component';
import { ModerationPanelComponent } from './components/moderation-panel/moderation-panel.component';
import { SystemMetricsComponent } from './components/system-metrics/system-metrics.component';

// Pipes
import { RoleDisplayPipe } from './pipes/role-display.pipe';
import { PermissionLabelPipe } from './pipes/permission-label.pipe';

// Models pour les logs de debug
import { UserRole } from './models/admin.models';

/**
 * Module Admin - Single Responsibility Principle
 *
 * Ce module encapsule UNIQUEMENT les fonctionnalités d'administration.
 * Il est complètement découplé des autres modules de l'application.
 */
@NgModule({
  imports: [
    // Modules Angular de base
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,

    // Modules de routing
    AdminRoutingModule,

    // Modules partagés
    SharedModule,

    // Modules externes
    NgApexchartsModule,

    // Directives standalone
    HasPermissionDirective,
    HasRoleDirective,
    HasPermissionElseDirective,

    // Pipes standalone
    RoleDisplayPipe,
    PermissionLabelPipe,
  ],

  declarations: [
    // === CONTAINERS ===
    AdminDashboardContainer,
    UserAdminContainer,
    ContentModerationContainer,
    AnalyticsOverviewContainer,
    SystemAdminContainer,

    // === PRESENTATIONAL COMPONENTS ===
    DashboardStatsComponent,
    UserManagementTableComponent,
    UserPermissionsModalComponent,
    AnalyticsChartComponent,
    ModerationPanelComponent,
    SystemMetricsComponent,
  ],

  providers: [
    // === SERVICES ===
    AdminApiService,
    AnalyticsApiService,
    PermissionService,

    // === GUARDS ===
    PermissionGuard,
  ],

  exports: [
    // Réexporter les directives standalone pour utilisation dans d'autres modules
    HasPermissionDirective,
    HasRoleDirective,
    HasPermissionElseDirective,

    // Réexporter les pipes standalone pour utilisation externe
    RoleDisplayPipe,
    PermissionLabelPipe,
  ],
})
export class AdminModule {
  /**
   * Configuration statique du module
   * Utilisée pour l'optimisation et la documentation
   */
  static readonly CONFIG = {
    name: 'AdminModule',
    version: '1.0.0',
    description:
      "Module d'administration principal avec 40 routes backend intégrées",
    features: [
      'Gestion des utilisateurs (7 permissions)',
      'Modération de contenu (6 permissions)',
      'Gestion des communautés (5 permissions)',
      'Analytics et rapports (6 permissions)',
      'Administration système (8 permissions)',
      'Tableau de bord multi-rôles',
      'Système de permissions granulaires',
      "Guards d'autorisation",
      'Directives de permissions',
      'API intégrée (28 routes admin + 12 routes analytics)',
    ],
    dependencies: [
      '@angular/core',
      '@angular/common',
      '@angular/forms',
      '@angular/router',
      'ng-apexcharts',
      'rxjs',
    ],
  } as const;

  /**
   * Méthode factory pour configuration avancée du module
   * Respecte le Factory Pattern et permet l'extensibilité
   */
  static forRoot(): any {
    return {
      ngModule: AdminModule,
      providers: [
        // Providers globaux pour l'ensemble de l'application
        {
          provide: 'ADMIN_CONFIG',
          useValue: AdminModule.CONFIG,
        },
      ],
    };
  }

  /**
   * Méthode factory pour configuration des modules enfants
   * Utilisée dans les feature modules qui dépendent d'AdminModule
   */
  static forChild(): any {
    return {
      ngModule: AdminModule,
      providers: [
        // Providers locaux pour les modules enfants
      ],
    };
  }

  /**
   * Méthode utilitaire pour déboguer le module en console
   * Utilisable dans la console : AdminModule.debug()
   */
  static debug(): void {
    console.group('🔍 AdminModule Debug Information');
    console.table({
      Version: AdminModule.CONFIG.version,
      Name: AdminModule.CONFIG.name,
      Description: AdminModule.CONFIG.description,
      Environment: environment.production ? 'Production' : 'Development',
      'API URL': environment.apiUrl,
    });

    console.group('📋 Features Details');
    AdminModule.CONFIG.features.forEach((feature, index) => {
      console.log(`%c${index + 1}. ${feature}`, 'color: #3b82f6;');
    });
    console.groupEnd();

    console.group('🔧 Dependencies');
    AdminModule.CONFIG.dependencies.forEach((dep) => {
      console.log(`📦 ${dep}`);
    });
    console.groupEnd();

    console.group('👥 User Roles Available');
    Object.entries(UserRole).forEach(([key, value]) => {
      console.log(`${key}: %c${value}`, 'color: #8b5cf6; font-weight: bold;');
    });
    console.groupEnd();

    console.log(
      '%cTip: Use window.adminDebug=true before loading for detailed startup logs',
      'color: #10b981;'
    );
    console.groupEnd();
  }

  constructor() {
    // Log de démarrage du module seulement en mode développement
    if (!environment.production) {
      console.group('[AdminModule] Initialization');
      console.log('🚀 Version:', AdminModule.CONFIG.version);
      console.log(
        '📋 Environment:',
        environment.production ? 'Production' : 'Development'
      );
      console.log(
        '🔧 Features:',
        AdminModule.CONFIG.features.length,
        'features loaded'
      );
      console.log('🌐 API Base URL:', environment.apiUrl);
      console.log(
        '🔌 Backend Routes:',
        '40 routes integrated (28 admin + 12 analytics)'
      );
      console.log(
        '📊 Components:',
        '11 total (5 containers + 6 presentational)'
      );
      console.log('🔐 Permissions:', '32 granular permissions available');
      console.log('👥 User Roles:', Object.keys(UserRole).join(', '));

      // Log détaillé des features si en mode debug
      if ((window as any).adminDebug) {
        console.group('📋 Detailed Features:');
        AdminModule.CONFIG.features.forEach((feature, index) => {
          console.log(`${index + 1}. ${feature}`);
        });
        console.groupEnd();
      }

      console.groupEnd();

      // Message de bienvenue pour les développeurs
      console.log(
        '%c🎯 AdminModule loaded successfully! Use window.adminDebug=true for detailed logs',
        'color: #10b981; font-weight: bold;'
      );
    }
  }
}

/**
 * Token d'injection pour la configuration du module
 * Permet l'injection de configuration dans les services
 */
export const ADMIN_MODULE_CONFIG = 'ADMIN_MODULE_CONFIG';

/**
 * Interface pour la configuration du module
 * Respecte l'Interface Segregation Principle
 */
export interface AdminModuleConfig {
  readonly apiUrl: string;
  readonly cacheEnabled: boolean;
  readonly cacheTTL: number;
  readonly debugMode: boolean;
  readonly features: {
    readonly userManagement: boolean;
    readonly contentModeration: boolean;
    readonly communityManagement: boolean;
    readonly analytics: boolean;
    readonly systemAdmin: boolean;
  };
}
