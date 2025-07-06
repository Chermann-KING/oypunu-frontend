import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TermsOfServiceComponent } from './components/terms-of-service/terms-of-service.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';

const routes: Routes = [
  {
    path: 'terms',
    component: TermsOfServiceComponent,
    data: { title: 'Conditions d\'utilisation' }
  },
  {
    path: 'privacy',
    component: PrivacyPolicyComponent,
    data: { title: 'Politique de confidentialité' }
  },
  {
    path: '',
    redirectTo: 'terms',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LegalRoutingModule { }