import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthGuard } from './guards/auth.guard';
import { NonAuthGuard } from './guards/non-auth.guard';

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule],
  providers: [
    AuthGuard,
    NonAuthGuard,
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
  exports: [],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        "CoreModule est déjà chargé. Importez-le uniquement dans l'AppModule."
      );
    }
  }
}
