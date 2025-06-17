import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchComponent } from './components/search/search.component';
import { WordDetailsComponent } from './components/word-details/word-details.component';
import { AddWordComponent } from './components/add-word/add-word.component';
import { AuthGuard } from '../../core/gards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: SearchComponent,
  },
  {
    path: 'word/:id',
    component: WordDetailsComponent,
  },
  {
    path: 'add',
    component: AddWordComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DictionaryRoutingModule {}
