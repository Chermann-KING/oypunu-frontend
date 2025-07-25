import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommunitiesComponent } from './components/communities/communities.component';
import { RouterModule } from '@angular/router';
import { CommunitiesRoutingModule } from './communities-routing.module';
import { CreateCommunityComponent } from './components/create-community/create-community.component';
import { CommunityDetailsComponent } from './components/community-details/community-details.component';
import { CommunityPostsComponent } from './components/community-posts/community-posts.component';
import { PostDetailComponent } from './components/post-detail/post-detail.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    CommunitiesComponent,
    CreateCommunityComponent,
    CommunityDetailsComponent,
    CommunityPostsComponent,
    PostDetailComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CommunitiesRoutingModule,
    SharedModule,
  ],
  exports: [CommunitiesComponent],
})
export class CommunitiesModule {}
