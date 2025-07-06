import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { RecommendationsModule } from './components/recommendations.module';
import { HomeComponent } from './components/home/home.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
];

@NgModule({
  declarations: [
    HomeComponent,
    LandingPageComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule, 
    FormsModule,
    SharedModule,
    RecommendationsModule,
    RouterModule.forChild(routes)
  ],
})
export class HomeModule {}
