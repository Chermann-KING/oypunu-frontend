import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchComponent } from './components/search/search.component';
import { WordDetailsComponent } from './components/word-details/word-details.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { AddWordComponent } from './components/add-word/add-word.component';
import { EditWordComponent } from './components/edit-word/edit-word.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { RoleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../core/models/admin';

const routes: Routes = [
  {
    path: '',
    component: SearchComponent,
  },
  {
    path: 'search',
    component: SearchResultsComponent,
  },
  {
    path: 'word/:id',
    component: WordDetailsComponent,
  },
  {
    path: 'edit/:id',
    component: EditWordComponent,
  },
  {
    path: 'add',
    component: AddWordComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { 
      minRole: UserRole.CONTRIBUTOR,
      roles: [UserRole.CONTRIBUTOR, UserRole.ADMIN, UserRole.SUPERADMIN]
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DictionaryRoutingModule {}
