import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UserStats } from '../../../core/models/user';
import { environment } from '../../../../environments/environment';

export interface UpdateProfileData {
  username?: string;
  nativeLanguage?: string;
  learningLanguages?: string[];
  profilePicture?: string;
  bio?: string;
  location?: string;
  website?: string;
  isProfilePublic?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }

  updateProfile(profileData: UpdateProfileData): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/profile`, profileData);
  }

  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/profile/stats`);
  }

  getUserByUsername(username: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${username}`);
  }

  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.apiUrl}/upload-avatar`,
      formData
    );
  }
}
