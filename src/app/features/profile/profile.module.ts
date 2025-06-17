import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileViewComponent } from './components/profile-view/profile-view.component';
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component';

@NgModule({
  declarations: [ProfileViewComponent, ProfileEditComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ProfileRoutingModule,
  ],
})
export class ProfileModule {}
