/**
 * @fileoverview Module de routing pour l'administration
 * 
 * Définit toutes les routes du module admin avec leurs guards d'autorisation.
 * Respecte les principes de sécurité avec permissions granulaires.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '../../core/guards/auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { Permission } from './models/permissions.models';
import { UserRole } from './models/admin.models';

// Containers
import { AdminDashboardContainer } from './containers/admin-dashboard/admin-dashboard.container';
import { UserAdminContainer } from './containers/user-admin/user-admin.container';
import { ContentModerationContainer } from './containers/content-moderation/content-moderation.container';
import { CategoryManagementContainer } from './containers/category-management/category-management.container';
import { AnalyticsOverviewContainer } from './containers/analytics-overview/analytics-overview.container';
import { SystemAdminContainer } from './containers/system-admin/system-admin.container';

/**
 * Routes du module admin avec système d'autorisation granulaire
 * 
 * Chaque route définit:
 * - Les guards d'authentification et d'autorisation
 * - Les permissions ou rôles requis
 * - Les données de contexte pour la navigation
 */
const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, PermissionGuard],
    canActivateChild: [PermissionGuard],
    data: {
      role: [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN]
    },
    children: [
      // Route par défaut - Dashboard adaptatif selon le rôle
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // === TABLEAU DE BORD ===
      {
        path: 'dashboard',
        component: AdminDashboardContainer,
        canActivate: [PermissionGuard],
        data: {
          title: 'Tableau de bord administrateur',
          breadcrumb: 'Dashboard',
          role: [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN],
          description: 'Vue d\'ensemble selon les permissions de l\'utilisateur'
        }
      },

      // === GESTION DES UTILISATEURS ===
      {
        path: 'users',
        component: UserAdminContainer,
        canActivate: [PermissionGuard],
        data: {
          title: 'Gestion des utilisateurs',
          breadcrumb: 'Utilisateurs',
          permission: Permission.VIEW_USERS,
          description: 'Administration des comptes utilisateurs'
        }
      },

      // === MODÉRATION DE CONTENU ===
      {
        path: 'moderation',
        component: ContentModerationContainer,
        canActivate: [PermissionGuard],
        data: {
          title: 'Modération de contenu',
          breadcrumb: 'Modération',
          permission: Permission.MODERATE_CONTENT,
          description: 'Validation et modération des mots soumis'
        }
      },

      // === GESTION DES CATÉGORIES ===
      {
        path: 'categories',
        component: CategoryManagementContainer,
        canActivate: [PermissionGuard],
        data: {
          title: 'Gestion des catégories',
          breadcrumb: 'Catégories',
          permission: Permission.MANAGE_CATEGORIES,
          description: 'Gestion des catégories par langue pour l\'organisation du dictionnaire'
        }
      },

      // === ANALYTICS ET RAPPORTS ===
      {
        path: 'analytics',
        component: AnalyticsOverviewContainer,
        canActivate: [PermissionGuard],
        data: {
          title: 'Analytics et rapports',
          breadcrumb: 'Analytics',
          permission: Permission.VIEW_ANALYTICS,
          description: 'Analyses et métriques détaillées'
        }
      },

      // === ADMINISTRATION SYSTÈME ===
      {
        path: 'system',
        component: SystemAdminContainer,
        canActivate: [PermissionGuard],
        data: {
          title: 'Administration système',
          breadcrumb: 'Système',
          permission: Permission.MANAGE_SYSTEM,
          description: 'Configuration système, logs et maintenance'
        }
      },

      // === GESTION DES LANGUES ===
      {
        path: 'languages',
        loadChildren: () => import('../languages/languages.module').then(m => m.LanguagesModule),
        canActivate: [PermissionGuard],
        data: {
          title: 'Gestion des langues',
          breadcrumb: 'Langues',
          permission: Permission.MANAGE_SYSTEM,
          description: 'Proposition et gestion des langues du dictionnaire'
        }
      },

      // === GESTION DES ERREURS ===
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];

/**
 * Module de routing admin - Single Responsibility Principle
 * 
 * Centralise toute la configuration de navigation pour le module admin.
 * Respecte les principes de sécurité avec guards et permissions granulaires.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {
  
  /**
   * Configuration statique du routing
   */
  static readonly CONFIG = {
    name: 'AdminRoutingModule',
    version: '1.0.0',
    description: 'Routing pour le module admin avec containers et permissions',
    routes: [
      'dashboard - Tableau de bord multi-rôles',
      'users - Gestion des utilisateurs', 
      'moderation - Modération de contenu',
      'categories - Gestion des catégories',
      'analytics - Analytics et rapports',
      'system - Administration système'
    ],
    guards: [
      'AuthGuard - Authentification requise',
      'PermissionGuard - Protection par permissions granulaires'
    ],
    security: {
      minRole: 'CONTRIBUTOR',
      permissionBased: true,
      contextualPermissions: true
    }
  } as const;

  constructor() {
    if ((window as any).adminDebug) {
      console.group('[AdminRoutingModule] Configuration active');
      console.log('Routes disponibles:', AdminRoutingModule.CONFIG.routes);
      console.log('Guards de sécurité:', AdminRoutingModule.CONFIG.guards);
      console.log('Sécurité:', AdminRoutingModule.CONFIG.security);
      console.groupEnd();
    }
  }
}