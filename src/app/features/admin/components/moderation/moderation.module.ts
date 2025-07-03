import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { WordModerationComponent } from './word-moderation.component';
import { LanguageModerationComponent } from './language-moderation.component';
import { SharedModule } from '../../../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: WordModerationComponent,
  },
  {
    path: 'languages',
    component: LanguageModerationComponent,
  },
];

@NgModule({
  declarations: [
    WordModerationComponent,
    LanguageModerationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    SharedModule,
  ],
})
export class ModerationModule {}
