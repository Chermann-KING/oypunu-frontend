import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AddCategoryComponent } from './components/add-category/add-category.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/admin';

const routes: Routes = [
  {
    path: 'add',
    component: AddCategoryComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      title: 'Proposer une nouvelle catégorie',
      breadcrumb: 'Ajouter une catégorie',
      minRole: UserRole.CONTRIBUTOR,
      roles: [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN]
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoriesRoutingModule { }