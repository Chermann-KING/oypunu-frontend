import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User } from '../../../core/models/user';
import { UserProfileResponse } from '../models/user-extended';

/**
 * Utilitaires pour normaliser les réponses du backend et corriger les types nullable
 */

/**
 * Normalise un utilisateur en gérant les propriétés boolean nullable
 */
export function normalizeUser(user: any): User {
  if (!user) return user;
  
  return {
    ...user,
    isProfilePublic: user.isProfilePublic !== false,  // défaut: true
    isEmailVerified: user.isEmailVerified === true,   // défaut: false  
    isOnline: user.isOnline === true                  // défaut: false
  };
}

/**
 * Normalise une réponse de profil utilisateur
 */
export function normalizeUserProfile(profile: any): UserProfileResponse {
  if (!profile) return profile;
  
  return {
    ...normalizeUser(profile),
    email: profile.email || '',
    isEmailVerified: profile.isEmailVerified === true,
    isProfilePublic: profile.isProfilePublic !== false
  };
}

/**
 * Opérateur RxJS pour normaliser automatiquement un User dans un Observable
 */
export function normalizeUserOperator() {
  return map((user: any) => normalizeUser(user));
}

/**
 * Opérateur RxJS pour normaliser automatiquement un tableau d'utilisateurs
 */
export function normalizeUsersOperator() {
  return map((users: any[]) => users.map(user => normalizeUser(user)));
}

/**
 * Opérateur RxJS pour normaliser automatiquement un UserProfile
 */
export function normalizeUserProfileOperator() {
  return map((profile: any) => normalizeUserProfile(profile));
}