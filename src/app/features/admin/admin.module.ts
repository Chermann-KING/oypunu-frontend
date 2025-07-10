import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// ApexCharts
import { NgApexchartsModule } from 'ng-apexcharts';

// Composants
import { AdminDashboardComponent } from './components/dashboard/admin-dashboard.component';
import { UserManagementComponent } from './components/users/user-management.component';
import { AddLanguageComponent } from './components/languages/add-language.component';
import { ContributorRequestsComponent } from './components/contributor-requests/contributor-requests.component';
import { ChartWidgetComponent } from './components/analytics/chart-widget.component';
import { MetricCardComponent } from './components/metric-card/metric-card.component';
import { SystemStatusComponent } from './components/system-status/system-status.component';
import { ActionButtonGroupComponent } from './components/action-button-group/action-button-group.component';

// Services
import { PermissionService } from './services/permission.service';
import { AnalyticsService } from './services/analytics.service';

// Guards
import { AdminGuard } from './guards/admin.guard';

// Modules
import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    // Composants
    AdminDashboardComponent,
    UserManagementComponent,
    AddLanguageComponent,
    ContributorRequestsComponent,
    ChartWidgetComponent,
    MetricCardComponent,
    SystemStatusComponent,
    ActionButtonGroupComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    AdminRoutingModule,
    SharedModule,
    NgApexchartsModule,
  ],
  providers: [
    // Services
    PermissionService,
    AnalyticsService,

    // Guards
    AdminGuard,
  ],
})
export class AdminModule {}
