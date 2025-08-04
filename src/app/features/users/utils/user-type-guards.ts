import { User } from '../../../core/models/user';

/**
 * Utilitaires de type guards et helpers pour les types nullable du User
 */

/**
 * Vérifie si le profil utilisateur est public (gère les valeurs null/undefined)
 */
export function isProfilePublic(user: User | null | undefined): boolean {
  if (!user) return false;
  // Par défaut, considérer le profil comme public si non spécifié
  return user.isProfilePublic !== false;
}

/**
 * Vérifie si l'email de l'utilisateur est vérifié (gère les valeurs null/undefined)
 */
export function isEmailVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  // Par défaut, considérer l'email comme non vérifié si non spécifié
  return user.isEmailVerified === true;
}

/**
 * Vérifie si l'utilisateur est en ligne (gère les valeurs null/undefined)
 */
export function isUserOnline(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.isOnline === true;
}

/**
 * Normalise les propriétés boolean nullable d'un utilisateur
 */
export function normalizeUserBooleans(user: User): User {
  return {
    ...user,
    isProfilePublic: user.isProfilePublic !== false, // défaut: true
    isEmailVerified: user.isEmailVerified === true,  // défaut: false
    isOnline: user.isOnline === true                 // défaut: false
  };
}

/**
 * Type guard pour vérifier qu'un objet est un User valide
 */
export function isValidUser(obj: any): obj is User {
  return obj && 
         typeof obj.id === 'string' && 
         typeof obj.username === 'string' && 
         typeof obj.email === 'string';
}

/**
 * Helper pour obtenir une valeur boolean safe depuis une propriété nullable
 */
export function safeBooleanValue(
  value: boolean | null | undefined, 
  defaultValue: boolean = false
): boolean {
  return value === null || value === undefined ? defaultValue : value;
}