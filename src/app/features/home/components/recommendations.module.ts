import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { IntelligentRecommendationsComponent } from '../../../shared/components/intelligent-recommendations/intelligent-recommendations.component';

@NgModule({
  declarations: [
    IntelligentRecommendationsComponent,
  ],
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    RouterModule
  ],
  exports: [
    IntelligentRecommendationsComponent,
  ],
})
export class RecommendationsModule {}