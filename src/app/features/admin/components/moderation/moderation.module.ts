import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { WordModerationComponent } from './word-moderation.component';
import { SharedModule } from '../../../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: WordModerationComponent,
  },
];

@NgModule({
  declarations: [WordModerationComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    SharedModule,
  ],
})
export class ModerationModule {}
