import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FavoritesRoutingModule } from './favorites-routing.module';
import { FavoriteWordsComponent } from './components/favorite-words/favorite-words.component';
import { SharedModule } from '../../shared/shared.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [FavoriteWordsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule,
    FavoritesRoutingModule,
  ],
  exports: [FavoriteWordsComponent],
})
export class FavoritesModule {}
