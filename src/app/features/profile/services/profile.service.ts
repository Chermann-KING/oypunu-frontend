import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User, UserStats } from '../../../core/models/user';
import { UsersService } from '../../users/services/users.service';
import { 
  UpdateProfileDto, 
  UserProfileResponse, 
  AvatarUploadResponse 
} from '../../users/models/user-extended';

/**
 * @deprecated Utiliser UsersService à la place
 * Service de profil maintenu pour la compatibilité ascendante
 * 
 * Ce service délègue maintenant toutes les opérations vers UsersService
 * pour éviter la duplication de code et centraliser la logique utilisateur.
 */
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
  constructor(private usersService: UsersService) {}

  /**
   * @deprecated Utiliser usersService.getProfile() à la place
   */
  getProfile(): Observable<User> {
    return this.usersService.getProfile();
  }

  /**
   * @deprecated Utiliser usersService.updateProfile() à la place
   */
  updateProfile(profileData: UpdateProfileData): Observable<User> {
    return this.usersService.updateProfile(profileData as UpdateProfileDto);
  }

  /**
   * @deprecated Utiliser usersService.getUserStats() à la place
   */
  getUserStats(): Observable<UserStats> {
    return this.usersService.getUserStats();
  }

  /**
   * @deprecated Utiliser usersService.getUserByUsername() à la place
   */
  getUserByUsername(username: string): Observable<User> {
    return this.usersService.getUserByUsername(username);
  }

  /**
   * @deprecated Utiliser usersService.uploadAvatar() à la place
   */
  uploadProfilePicture(file: File): Observable<{ url: string }> {
    return this.usersService.uploadAvatar(file);
  }
}
