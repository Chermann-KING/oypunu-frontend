import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommunitiesComponent } from './components/communities/communities.component';
import { CreateCommunityComponent } from './components/create-community/create-community.component';
import { CommunityDetailsComponent } from './components/community-details/community-details.component';
import { CommunityPostsComponent } from './components/community-posts/community-posts.component';
import { PostDetailComponent } from './components/post-detail/post-detail.component';

const routes: Routes = [
  { path: '', component: CommunitiesComponent },
  { path: 'create', component: CreateCommunityComponent },
  { path: ':id', component: CommunityDetailsComponent },
  {
    path: ':id/posts',
    component: CommunityPostsComponent,
  },
  {
    path: ':id/posts/:postId',
    component: PostDetailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommunitiesRoutingModule {}
