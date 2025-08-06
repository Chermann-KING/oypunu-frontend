/**
 * @fileoverview Pipe pour l'affichage des rôles utilisateur
 * 
 * Pipe qui transforme les valeurs de rôles en libellés lisibles par l'utilisateur.
 * Respecte le principe Single Responsibility et est facilement extensible.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '../models/admin.models';

/**
 * Pipe RoleDisplay - Single Responsibility Principle
 * 
 * Ce pipe se contente uniquement de transformer les rôles en libellés.
 * Il ne contient aucune logique métier complexe.
 */
@Pipe({
  name: 'roleDisplay',
  pure: true // Optimisation: pipe pur pour better performance
})
export class RoleDisplayPipe implements PipeTransform {

  /**
   * Mapping des rôles vers leurs libellés français
   * Respecte l'Open/Closed Principle - extensible sans modification
   */
  private readonly roleLabels: Record<UserRole, string> = {
    [UserRole.USER]: 'Utilisateur',
    [UserRole.CONTRIBUTOR]: 'Contributeur',
    [UserRole.ADMIN]: 'Administrateur',
    [UserRole.SUPERADMIN]: 'Super-Administrateur'
  };

  /**
   * Mapping des rôles vers leurs descriptions
   */
  private readonly roleDescriptions: Record<UserRole, string> = {
    [UserRole.USER]: 'Utilisateur standard de la plateforme',
    [UserRole.CONTRIBUTOR]: 'Peut modérer et contribuer au contenu',
    [UserRole.ADMIN]: 'Peut administrer les utilisateurs et communautés',
    [UserRole.SUPERADMIN]: 'Accès complet à toutes les fonctionnalités'
  };

  /**
   * Transforme un rôle en libellé lisible
   * 
   * @param value - Rôle à transformer
   * @param format - Format d'affichage ('label' | 'description' | 'both')
   * @returns Libellé formaté du rôle
   */
  transform(
    value: UserRole | string | null | undefined, 
    format: 'label' | 'description' | 'both' = 'label'
  ): string {
    if (!value) {
      return 'Rôle inconnu';
    }

    // Conversion en UserRole si nécessaire
    const role = this.normalizeRole(value);
    
    if (!role || !this.isValidRole(role)) {
      return 'Rôle invalide';
    }

    switch (format) {
      case 'label':
        return this.roleLabels[role];
      
      case 'description':
        return this.roleDescriptions[role];
      
      case 'both':
        return `${this.roleLabels[role]} - ${this.roleDescriptions[role]}`;
      
      default:
        return this.roleLabels[role];
    }
  }

  /**
   * Normalise la valeur d'entrée en UserRole
   */
  private normalizeRole(value: UserRole | string): UserRole | null {
    if (typeof value === 'string') {
      // Essayer de convertir la chaîne en UserRole
      const normalizedValue = value.toLowerCase();
      
      switch (normalizedValue) {
        case 'user':
          return UserRole.USER;
        case 'contributor':
          return UserRole.CONTRIBUTOR;
        case 'admin':
          return UserRole.ADMIN;
        case 'superadmin':
          return UserRole.SUPERADMIN;
        default:
          return null;
      }
    }
    
    return value as UserRole;
  }

  /**
   * Vérifie si un rôle est valide
   */
  private isValidRole(role: UserRole): boolean {
    return Object.values(UserRole).includes(role);
  }

  /**
   * Méthode statique pour obtenir tous les rôles avec leurs libellés
   * Utile pour les listes déroulantes et la documentation
   */
  static getAllRoles(): Array<{ value: UserRole; label: string; description: string }> {
    const pipe = new RoleDisplayPipe();
    
    return Object.values(UserRole).map(role => ({
      value: role,
      label: pipe.roleLabels[role],
      description: pipe.roleDescriptions[role]
    }));
  }

  /**
   * Méthode statique pour obtenir la hiérarchie des rôles
   * Utile pour les vérifications d'autorisation
   */
  static getRoleHierarchy(): Record<UserRole, number> {
    return {
      [UserRole.USER]: 1,
      [UserRole.CONTRIBUTOR]: 2,
      [UserRole.ADMIN]: 3,
      [UserRole.SUPERADMIN]: 4
    };
  }

  /**
   * Méthode statique pour comparer deux rôles
   */
  static compareRoles(roleA: UserRole, roleB: UserRole): number {
    const hierarchy = RoleDisplayPipe.getRoleHierarchy();
    return hierarchy[roleA] - hierarchy[roleB];
  }

  /**
   * Méthode statique pour vérifier si un rôle est supérieur à un autre
   */
  static isHigherRole(role: UserRole, comparedTo: UserRole): boolean {
    return RoleDisplayPipe.compareRoles(role, comparedTo) > 0;
  }
}