import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.module').then((m) => m.AuthModule),
  },
  // {
  //   path: 'verify-email/:token',
  //   loadChildren: () =>
  //     import('./features/auth/auth.module').then((m) => m.AuthModule),
  // },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/profile/profile.module').then((m) => m.ProfileModule),
  },
  {
    path: 'dictionary',
    loadChildren: () =>
      import('./features/dictionary/dictionary.module').then(
        (m) => m.DictionaryModule
      ),
  },
  {
    path: 'favorites',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/favorites/favorites.module').then(
        (m) => m.FavoritesModule
      ),
  },
  {
    path: 'messaging',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/messaging/messaging.module').then(
        (m) => m.MessagingModule
      ),
  },
  {
    path: 'communities',
    loadChildren: () =>
      import('./features/communities/communities.module').then(
        (m) => m.CommunitiesModule
      ),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/admin/admin.module').then((m) => m.AdminModule),
  },
  {
    path: 'legal',
    loadChildren: () =>
      import('./features/legal/legal.module').then((m) => m.LegalModule),
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
