import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { NonAuthGuard } from '../../core/gards/non-auth.guard';
import { SocialAuthComponent } from './components/social-auth/social-auth.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [NonAuthGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [NonAuthGuard],
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [NonAuthGuard],
  },
  {
    path: 'reset-password/:token',
    component: ResetPasswordComponent,
    canActivate: [NonAuthGuard],
  },
  {
    path: 'verify-email/:token',
    component: VerifyEmailComponent,
  },
  {
    path: 'social-auth-success',
    component: SocialAuthComponent,
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
