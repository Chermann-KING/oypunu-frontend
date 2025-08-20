import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { LanguagesRoutingModule } from './languages-routing.module';
import { SharedModule } from '../../shared/shared.module';

// Components
import { AddLanguageComponent } from './components/add-language/add-language.component';

@NgModule({
  declarations: [
    AddLanguageComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LanguagesRoutingModule,
    SharedModule
  ]
})
export class LanguagesModule { }