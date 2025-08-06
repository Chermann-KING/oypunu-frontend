/**
 * @fileoverview Pipe pour l'affichage des permissions
 * 
 * Pipe qui transforme les valeurs de permissions en libellés lisibles.
 * Respecte les principes SOLID et facilite l'internationalisation.
 * 
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Pipe, PipeTransform } from '@angular/core';
import { Permission } from '../models/permissions.models';

/**
 * Pipe PermissionLabel - Single Responsibility Principle
 * 
 * Ce pipe se contente uniquement de transformer les permissions en libellés.
 * Il est découplé de la logique de vérification des permissions.
 */
@Pipe({
  name: 'permissionLabel',
  pure: true // Optimisation: pipe pur pour better performance
})
export class PermissionLabelPipe implements PipeTransform {

  /**
   * Mapping des permissions vers leurs libellés français
   * Organisé par catégories pour une meilleure maintenance
   */
  private readonly permissionLabels: Record<Permission, string> = {
    // === PERMISSIONS UTILISATEURS ===
    [Permission.VIEW_USERS]: 'Voir les utilisateurs',
    [Permission.EDIT_USERS]: 'Modifier les utilisateurs',
    [Permission.SUSPEND_USERS]: 'Suspendre les utilisateurs',
    [Permission.DELETE_USERS]: 'Supprimer les utilisateurs',
    [Permission.CHANGE_USER_ROLES]: 'Modifier les rôles utilisateur',
    [Permission.VIEW_USER_DETAILS]: 'Voir les détails utilisateur',
    [Permission.EXPORT_USER_DATA]: 'Exporter les données utilisateur',

    // === PERMISSIONS MODÉRATION ===
    [Permission.MODERATE_CONTENT]: 'Modérer le contenu',
    [Permission.APPROVE_WORDS]: 'Approuver les mots',
    [Permission.REJECT_WORDS]: 'Rejeter les mots',
    [Permission.VIEW_PENDING_WORDS]: 'Voir les mots en attente',
    [Permission.MODERATE_REVISIONS]: 'Modérer les révisions',
    [Permission.VIEW_MODERATION_HISTORY]: 'Voir l\'historique de modération',

    // === PERMISSIONS COMMUNAUTÉS ===
    [Permission.MANAGE_COMMUNITIES]: 'Gérer les communautés',
    [Permission.CREATE_COMMUNITIES]: 'Créer des communautés',
    [Permission.DELETE_COMMUNITIES]: 'Supprimer les communautés',
    [Permission.VIEW_COMMUNITY_DETAILS]: 'Voir les détails des communautés',
    [Permission.MODERATE_COMMUNITY_CONTENT]: 'Modérer le contenu des communautés',

    // === PERMISSIONS ANALYTICS ===
    [Permission.VIEW_ANALYTICS]: 'Voir les analytics',
    [Permission.VIEW_USER_ANALYTICS]: 'Voir les analytics utilisateur',
    [Permission.VIEW_CONTENT_ANALYTICS]: 'Voir les analytics de contenu',
    [Permission.VIEW_COMMUNITY_ANALYTICS]: 'Voir les analytics des communautés',
    [Permission.VIEW_SYSTEM_METRICS]: 'Voir les métriques système',
    [Permission.EXPORT_ANALYTICS]: 'Exporter les analytics',

    // === PERMISSIONS SYSTÈME ===
    [Permission.MANAGE_SYSTEM]: 'Gérer le système',
    [Permission.VIEW_SYSTEM_LOGS]: 'Voir les logs système',
    [Permission.MANAGE_LANGUAGES]: 'Gérer les langues',
    [Permission.MANAGE_SETTINGS]: 'Gérer les paramètres',
    [Permission.VIEW_AUDIT_LOGS]: 'Voir les logs d\'audit',
    [Permission.MANAGE_BACKUPS]: 'Gérer les sauvegardes',

    // === PERMISSIONS RAPPORTS ===
    [Permission.GENERATE_REPORTS]: 'Générer des rapports',
    [Permission.EXPORT_DATA]: 'Exporter des données',
    [Permission.SCHEDULE_REPORTS]: 'Programmer des rapports',
    [Permission.VIEW_SYSTEM_STATUS]: 'Voir le statut du système'
  };

  /**
   * Descriptions détaillées des permissions
   */
  private readonly permissionDescriptions: Record<Permission, string> = {
    // === PERMISSIONS UTILISATEURS ===
    [Permission.VIEW_USERS]: 'Consulter la liste des utilisateurs et leurs informations de base',
    [Permission.EDIT_USERS]: 'Modifier les informations des comptes utilisateur',
    [Permission.SUSPEND_USERS]: 'Suspendre temporairement ou définitivement des comptes',
    [Permission.DELETE_USERS]: 'Supprimer définitivement des comptes utilisateur',
    [Permission.CHANGE_USER_ROLES]: 'Modifier les rôles et niveaux d\'accès des utilisateurs',
    [Permission.VIEW_USER_DETAILS]: 'Accéder aux détails complets des profils utilisateur',
    [Permission.EXPORT_USER_DATA]: 'Exporter les données utilisateur pour analyse ou sauvegarde',

    // === PERMISSIONS MODÉRATION ===
    [Permission.MODERATE_CONTENT]: 'Valider, approuver ou rejeter le contenu soumis',
    [Permission.APPROVE_WORDS]: 'Approuver les nouveaux mots soumis par les utilisateurs',
    [Permission.REJECT_WORDS]: 'Rejeter les mots non conformes avec justification',
    [Permission.VIEW_PENDING_WORDS]: 'Consulter la liste des mots en attente de validation',
    [Permission.MODERATE_REVISIONS]: 'Valider les modifications apportées aux mots existants',
    [Permission.VIEW_MODERATION_HISTORY]: 'Consulter l\'historique des actions de modération',

    // === PERMISSIONS COMMUNAUTÉS ===
    [Permission.MANAGE_COMMUNITIES]: 'Administrer les communautés et leurs paramètres',
    [Permission.CREATE_COMMUNITIES]: 'Créer de nouvelles communautés thématiques',
    [Permission.DELETE_COMMUNITIES]: 'Supprimer des communautés inactives ou problématiques',
    [Permission.VIEW_COMMUNITY_DETAILS]: 'Accéder aux statistiques détaillées des communautés',
    [Permission.MODERATE_COMMUNITY_CONTENT]: 'Modérer les publications et commentaires des communautés',

    // === PERMISSIONS ANALYTICS ===
    [Permission.VIEW_ANALYTICS]: 'Consulter les tableaux de bord analytiques généraux',
    [Permission.VIEW_USER_ANALYTICS]: 'Analyser les données de comportement des utilisateurs',
    [Permission.VIEW_CONTENT_ANALYTICS]: 'Analyser les performances et tendances du contenu',
    [Permission.VIEW_COMMUNITY_ANALYTICS]: 'Analyser l\'engagement et la croissance des communautés',
    [Permission.VIEW_SYSTEM_METRICS]: 'Consulter les métriques de performance technique',
    [Permission.EXPORT_ANALYTICS]: 'Exporter les données analytiques en différents formats',

    // === PERMISSIONS SYSTÈME ===
    [Permission.MANAGE_SYSTEM]: 'Administrer les paramètres et configuration du système',
    [Permission.VIEW_SYSTEM_LOGS]: 'Consulter les journaux d\'événements système',
    [Permission.MANAGE_LANGUAGES]: 'Ajouter, modifier ou supprimer des langues supportées',
    [Permission.MANAGE_SETTINGS]: 'Modifier les paramètres globaux de l\'application',
    [Permission.VIEW_AUDIT_LOGS]: 'Consulter les logs d\'audit et de sécurité',
    [Permission.MANAGE_BACKUPS]: 'Gérer les sauvegardes et restaurations de données',

    // === PERMISSIONS RAPPORTS ===
    [Permission.GENERATE_REPORTS]: 'Créer des rapports personnalisés et automatisés',
    [Permission.EXPORT_DATA]: 'Exporter des données en formats CSV, JSON, PDF',
    [Permission.SCHEDULE_REPORTS]: 'Programmer l\'envoi automatique de rapports',
    [Permission.VIEW_SYSTEM_STATUS]: 'Consulter l\'état de santé et la disponibilité du système'
  };

  /**
   * Catégories de permissions pour l'organisation
   */
  private readonly permissionCategories: Record<string, Permission[]> = {
    'Utilisateurs': [
      Permission.VIEW_USERS,
      Permission.EDIT_USERS,
      Permission.SUSPEND_USERS,
      Permission.DELETE_USERS,
      Permission.CHANGE_USER_ROLES,
      Permission.VIEW_USER_DETAILS,
      Permission.EXPORT_USER_DATA
    ],
    'Modération': [
      Permission.MODERATE_CONTENT,
      Permission.APPROVE_WORDS,
      Permission.REJECT_WORDS,
      Permission.VIEW_PENDING_WORDS,
      Permission.MODERATE_REVISIONS,
      Permission.VIEW_MODERATION_HISTORY
    ],
    'Communautés': [
      Permission.MANAGE_COMMUNITIES,
      Permission.CREATE_COMMUNITIES,
      Permission.DELETE_COMMUNITIES,
      Permission.VIEW_COMMUNITY_DETAILS,
      Permission.MODERATE_COMMUNITY_CONTENT
    ],
    'Analytics': [
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_USER_ANALYTICS,
      Permission.VIEW_CONTENT_ANALYTICS,
      Permission.VIEW_COMMUNITY_ANALYTICS,
      Permission.VIEW_SYSTEM_METRICS,
      Permission.EXPORT_ANALYTICS
    ],
    'Système': [
      Permission.MANAGE_SYSTEM,
      Permission.VIEW_SYSTEM_LOGS,
      Permission.MANAGE_LANGUAGES,
      Permission.MANAGE_SETTINGS,
      Permission.VIEW_AUDIT_LOGS,
      Permission.MANAGE_BACKUPS
    ],
    'Rapports': [
      Permission.GENERATE_REPORTS,
      Permission.EXPORT_DATA,
      Permission.SCHEDULE_REPORTS,
      Permission.VIEW_SYSTEM_STATUS
    ]
  };

  /**
   * Transforme une permission en libellé lisible
   * 
   * @param value - Permission à transformer
   * @param format - Format d'affichage ('label' | 'description' | 'both' | 'category')
   * @returns Libellé formaté de la permission
   */
  transform(
    value: Permission | string | null | undefined,
    format: 'label' | 'description' | 'both' | 'category' = 'label'
  ): string {
    if (!value) {
      return 'Permission inconnue';
    }

    // Conversion en Permission si nécessaire
    const permission = this.normalizePermission(value);
    
    if (!permission || !this.isValidPermission(permission)) {
      return 'Permission invalide';
    }

    switch (format) {
      case 'label':
        return this.permissionLabels[permission];
      
      case 'description':
        return this.permissionDescriptions[permission];
      
      case 'both':
        return `${this.permissionLabels[permission]} - ${this.permissionDescriptions[permission]}`;
      
      case 'category':
        return this.getPermissionCategory(permission);
      
      default:
        return this.permissionLabels[permission];
    }
  }

  /**
   * Normalise la valeur d'entrée en Permission
   */
  private normalizePermission(value: Permission | string): Permission | null {
    if (typeof value === 'string') {
      // Vérifier si la chaîne correspond à une permission valide
      const permissionValue = value as Permission;
      return this.isValidPermission(permissionValue) ? permissionValue : null;
    }
    
    return value as Permission;
  }

  /**
   * Vérifie si une permission est valide
   */
  private isValidPermission(permission: Permission): boolean {
    return Object.values(Permission).includes(permission);
  }

  /**
   * Récupère la catégorie d'une permission
   */
  private getPermissionCategory(permission: Permission): string {
    for (const [category, permissions] of Object.entries(this.permissionCategories)) {
      if (permissions.includes(permission)) {
        return category;
      }
    }
    return 'Autre';
  }

  /**
   * Méthode statique pour obtenir toutes les permissions avec leurs libellés
   */
  static getAllPermissions(): Array<{ 
    value: Permission; 
    label: string; 
    description: string;
    category: string;
  }> {
    const pipe = new PermissionLabelPipe();
    
    return Object.values(Permission).map(permission => ({
      value: permission,
      label: pipe.permissionLabels[permission],
      description: pipe.permissionDescriptions[permission],
      category: pipe.getPermissionCategory(permission)
    }));
  }

  /**
   * Méthode statique pour obtenir les permissions par catégorie
   */
  static getPermissionsByCategory(): Record<string, Array<{
    value: Permission;
    label: string;
    description: string;
  }>> {
    const pipe = new PermissionLabelPipe();
    const result: Record<string, Array<any>> = {};

    for (const [category, permissions] of Object.entries(pipe.permissionCategories)) {
      result[category] = permissions.map(permission => ({
        value: permission,
        label: pipe.permissionLabels[permission],
        description: pipe.permissionDescriptions[permission]
      }));
    }

    return result;
  }

  /**
   * Méthode statique pour rechercher des permissions par mot-clé
   */
  static searchPermissions(keyword: string): Permission[] {
    const pipe = new PermissionLabelPipe();
    const searchTerm = keyword.toLowerCase();

    return Object.entries(pipe.permissionLabels)
      .filter(([permission, label]) => 
        label.toLowerCase().includes(searchTerm) ||
        pipe.permissionDescriptions[permission as Permission].toLowerCase().includes(searchTerm)
      )
      .map(([permission]) => permission as Permission);
  }
}