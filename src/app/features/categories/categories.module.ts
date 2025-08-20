import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CategoriesRoutingModule } from './categories-routing.module';
import { SharedModule } from '../../shared/shared.module';

// Components
import { AddCategoryComponent } from './components/add-category/add-category.component';

@NgModule({
  declarations: [
    AddCategoryComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CategoriesRoutingModule,
    SharedModule
  ]
})
export class CategoriesModule { }