import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FavoriteWordsComponent } from './components/favorite-words/favorite-words.component';
import { AuthGuard } from '../../core/gards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: FavoriteWordsComponent,
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FavoritesRoutingModule {}
