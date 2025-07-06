import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LegalRoutingModule } from './legal-routing.module';
import { TermsOfServiceComponent } from './components/terms-of-service/terms-of-service.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';

@NgModule({
  declarations: [
    TermsOfServiceComponent,
    PrivacyPolicyComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    LegalRoutingModule
  ]
})
export class LegalModule { }