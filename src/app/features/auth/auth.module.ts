import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { SocialAuthComponent } from './components/social-auth/social-auth.component';
import { ContributorRequestComponent } from './components/contributor-request/contributor-request.component';
import { PasswordStrengthComponent } from '../../shared/components/password-strength/password-strength.component';

@NgModule({
  declarations: [
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    VerifyEmailComponent,
    SocialAuthComponent,
    ContributorRequestComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, AuthRoutingModule, SharedModule, PasswordStrengthComponent],
  exports: [ContributorRequestComponent],
})
export class AuthModule {}
