import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Composants
import { AdminDashboardComponent } from './components/dashboard/admin-dashboard.component';
import { UserManagementComponent } from './components/users/user-management.component';
import { AddLanguageComponent } from './components/languages/add-language.component';

// Services
import { PermissionService } from './services/permission.service';

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
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    AdminRoutingModule,
    SharedModule,
  ],
  providers: [
    // Services
    PermissionService,

    // Guards
    AdminGuard,
  ],
})
export class AdminModule {}
