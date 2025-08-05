import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { AuthGuard } from '../../core/guards/auth.guard';
import { UserRole } from '../../core/models/admin';

// Import des composants
import { AdminDashboardComponent } from './components/dashboard/admin-dashboard.component';
import { UserManagementComponent } from './components/users/user-management.component';
import { AddLanguageComponent } from './components/languages/add-language.component';
import { ContributorRequestsComponent } from './components/contributor-requests/contributor-requests.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, AdminGuard],
    canActivateChild: [AdminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        canActivate: [AdminRoleGuard],
        data: {
          role: UserRole.CONTRIBUTOR,
          title: 'Tableau de bord administrateur',
        },
      },
      {
        path: 'users',
        component: UserManagementComponent,
        canActivate: [AdminRoleGuard],
        data: {
          role: UserRole.ADMIN,
          permission: 'canViewUsers',
          title: 'Gestion des utilisateurs',
        },
      },
      {
        path: 'contributor-requests',
        component: ContributorRequestsComponent,
        canActivate: [AdminRoleGuard],
        data: {
          role: UserRole.ADMIN,
          permission: 'canViewUsers',
          title: 'Demandes de contribution',
        },
      },
      {
        path: 'languages',
        children: [
          {
            path: '',
            redirectTo: 'add',
            pathMatch: 'full',
          },
          {
            path: 'add',
            component: AddLanguageComponent,
            canActivate: [AdminRoleGuard],
            data: {
              role: UserRole.CONTRIBUTOR,
              permission: 'canManageLanguages',
              title: 'Ajouter une langue',
            },
          },
        ],
      },
      {
        path: 'moderation',
        loadChildren: () =>
          import('./components/moderation/moderation.module').then(
            (m) => m.ModerationModule
          ),
        canActivate: [AdminRoleGuard],
        data: {
          role: UserRole.CONTRIBUTOR,
          permission: 'canModerateContent',
          title: 'Modération des contenus',
        },
      },
      // Routes futures pour l'Étape 3 (commentées en attendant l'implémentation)
      /*
      {
        path: 'communities',
        loadChildren: () =>
          import(
            './components/community-management/community-management.module'
          ).then((m) => m.CommunityManagementModule),
        canActivate: [RoleGuard],
        data: {
          roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
          title: 'Gestion des communautés',
        },
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./components/reports/reports.module').then(
            (m) => m.ReportsModule
          ),
        canActivate: [RoleGuard],
        data: {
          roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
          title: 'Rapports et statistiques',
        },
      },
      {
        path: 'system',
        loadChildren: () =>
          import('./components/system/system.module').then(
            (m) => m.SystemModule
          ),
        canActivate: [RoleGuard],
        data: {
          roles: [UserRole.SUPERADMIN],
          title: 'Administration système',
        },
      },
      {
        path: 'activity',
        loadChildren: () =>
          import('./components/activity/activity.module').then(
            (m) => m.ActivityModule
          ),
        canActivate: [RoleGuard],
        data: {
          roles: [UserRole.ADMIN, UserRole.SUPERADMIN],
          title: 'Activité et logs',
        },
      },
      */
      // Route catch-all pour les erreurs 404 dans l'admin
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
