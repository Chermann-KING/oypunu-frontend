import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Post,
  Comment,
  PostFormData,
  CommentFormData,
  PostsResponse,
  PostDetailResponse,
  VoteResponse,
} from '../models/community-posts';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class CommunityPostsService {
  private readonly _API_URL = `${environment.apiUrl}/community-posts`;

  constructor(private _http: HttpClient, private _authService: AuthService) {}

  createPost(communityId: string, postData: PostFormData): Observable<Post> {
    console.log('Token actuel:', this._authService.getToken());

    return this._http.post<Post>(
      `${this._API_URL}/communities/${communityId}/posts`,
      postData
    );
  }

  getPosts(
    communityId: string,
    page = 1,
    limit = 10,
    filters?: {
      sortBy?: 'score' | 'newest' | 'oldest' | 'activity' | 'controversial';
      postType?: string;
      languages?: string[];
      difficulty?: string;
      tags?: string[];
      timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
    }
  ): Observable<PostsResponse> {
    let params = new HttpParams()
      .append('page', page.toString())
      .append('limit', limit.toString());

    if (filters) {
      if (filters.sortBy) params = params.append('sortBy', filters.sortBy);
      if (filters.postType)
        params = params.append('postType', filters.postType);
      if (filters.difficulty)
        params = params.append('difficulty', filters.difficulty);
      if (filters.timeRange)
        params = params.append('timeRange', filters.timeRange);
      if (filters.languages?.length)
        params = params.append('languages', filters.languages.join(','));
      if (filters.tags?.length)
        params = params.append('tags', filters.tags.join(','));
    }

    return this._http.get<PostsResponse>(
      `${this._API_URL}/communities/${communityId}/posts`,
      { params }
    );
  }

  getPost(postId: string): Observable<any> {
    return this._http.get<any>(`${this._API_URL}/posts/${postId}`);
  }

  getCommentsByPost(
    postId: string,
    page = 1,
    limit = 20,
    sortBy: 'score' | 'newest' | 'oldest' = 'score'
  ): Observable<any> {
    return this._http.get<any>(`${this._API_URL}/posts/${postId}/comments`, {
      params: new HttpParams()
        .append('page', page.toString())
        .append('limit', limit.toString())
        .append('sortBy', sortBy),
    });
  }

  addComment(
    postId: string,
    commentData: CommentFormData
  ): Observable<Comment> {
    return this._http.post<Comment>(
      `${this._API_URL}/posts/${postId}/comments`,
      commentData
    );
  }

  // Nouveaux endpoints de vote (remplace les likes)
  votePost(
    postId: string,
    voteType: 'up' | 'down',
    reason?: string
  ): Observable<VoteResponse> {
    return this._http.post<VoteResponse>(
      `${this._API_URL}/posts/${postId}/vote`,
      {
        voteType,
        reason,
      }
    );
  }

  voteComment(
    commentId: string,
    voteType: 'up' | 'down',
    reason?: string
  ): Observable<VoteResponse> {
    return this._http.post<VoteResponse>(
      `${this._API_URL}/comments/${commentId}/vote`,
      { voteType, reason }
    );
  }

  // Obtenir les votes de l'utilisateur pour plusieurs contenus
  getUserVotes(
    postIds?: string[],
    commentIds?: string[]
  ): Observable<{
    posts: { [key: string]: string | null };
    comments: { [key: string]: string | null };
  }> {
    let params = new HttpParams();
    if (postIds?.length) params = params.append('postIds', postIds.join(','));
    if (commentIds?.length)
      params = params.append('commentIds', commentIds.join(','));

    return this._http.get<{
      posts: { [key: string]: string | null };
      comments: { [key: string]: string | null };
    }>(`${this._API_URL}/user/votes`, { params });
  }

  // Marquer une réponse comme acceptée
  acceptAnswer(
    postId: string,
    commentId: string
  ): Observable<{ success: boolean; message: string }> {
    return this._http.patch<{ success: boolean; message: string }>(
      `${this._API_URL}/posts/${postId}/comments/${commentId}/accept`,
      {}
    );
  }

  // Épingler/dépingler un post
  togglePinPost(
    postId: string
  ): Observable<{ success: boolean; isPinned: boolean; message: string }> {
    return this._http.patch<{
      success: boolean;
      isPinned: boolean;
      message: string;
    }>(`${this._API_URL}/posts/${postId}/pin`, {});
  }

  // Obtenir les posts tendances
  getTrendingPosts(
    communityId: string,
    limit = 10,
    timeRange: 'day' | 'week' | 'month' = 'week'
  ): Observable<Post[]> {
    return this._http.get<Post[]>(
      `${this._API_URL}/communities/${communityId}/trending`,
      {
        params: new HttpParams()
          .append('limit', limit.toString())
          .append('timeRange', timeRange),
      }
    );
  }

  // Obtenir les statistiques d'une communauté
  getCommunityStats(communityId: string): Observable<{
    totalPosts: number;
    totalComments: number;
    totalScore: number;
    averageScore: number;
    topContributors: any[];
    postsByType: any[];
  }> {
    return this._http.get<any>(
      `${this._API_URL}/communities/${communityId}/stats`
    );
  }

  deletePost(postId: string): Observable<{ success: boolean }> {
    return this._http.delete<{ success: boolean }>(
      `${this._API_URL}/posts/${postId}`
    );
  }

  deleteComment(commentId: string): Observable<{ success: boolean }> {
    return this._http.delete<{ success: boolean }>(
      `${this._API_URL}/comments/${commentId}`
    );
  }

  // Méthodes de compatibilité (pour une transition en douceur)
  toggleLikePost(postId: string): Observable<VoteResponse> {
    // Par défaut, upvote si c'était un like
    return this.votePost(postId, 'up');
  }

  toggleLikeComment(commentId: string): Observable<VoteResponse> {
    // Par défaut, upvote si c'était un like
    return this.voteComment(commentId, 'up');
  }

  // Récupérer les langues disponibles
  getAvailableLanguages(): Observable<
    {
      code: string;
      name: string;
      nativeName: string;
      wordCount: number;
    }[]
  > {
    return this._http.get<
      {
        code: string;
        name: string;
        nativeName: string;
        wordCount: number;
      }[]
    >(`${environment.apiUrl}/words/languages`);
  }
}
