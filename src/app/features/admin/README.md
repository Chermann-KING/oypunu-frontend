# Module Administration O'Ypunu

## 🎯 Vue d'ensemble

Le module d'administration fournit un système complet de gestion des utilisateurs, modération des contenus et administration système avec un contrôle d'accès basé sur les rôles.

## 🔐 Système de Rôles

### Hiérarchie des rôles

1. **USER** (0) - Utilisateur standard
2. **CONTRIBUTOR** (1) - Contributeur/Modérateur
3. **ADMIN** (2) - Administrateur
4. **SUPERADMIN** (3) - Super Administrateur

### Permissions par rôle

#### CONTRIBUTOR

- Accès au tableau de bord admin
- Modération des mots (approuver/rejeter)
- Statistiques de modération

#### ADMIN

- Toutes les permissions CONTRIBUTOR +
- Gestion des utilisateurs (suspension)
- Gestion des communautés
- Rapports et statistiques
- Logs d'activité

#### SUPERADMIN

- Toutes les permissions ADMIN +
- Changement des rôles utilisateur
- Paramètres système
- Métriques système
- Configuration globale

## 🛡️ Guards et Protection des Routes

### AdminGuard

Protège l'accès au module d'administration :

```typescript
// Utilisation dans les routes
{
  path: 'admin',
  canActivate: [AuthGuard, AdminGuard],
  canActivateChild: [AdminGuard],
  // ...
}
```

### RoleGuard

Contrôle l'accès selon les rôles spécifiques :

```typescript
// Par rôles exacts
{
  path: 'users',
  canActivate: [RoleGuard],
  data: { roles: [UserRole.ADMIN, UserRole.SUPERADMIN] }
}

// Par niveau minimum
{
  path: 'moderation',
  canActivate: [RoleGuard],
  data: { minRole: UserRole.CONTRIBUTOR }
}
```

## 🎛️ Service de Permissions

### PermissionService

Fournit des méthodes pour vérifier les permissions :

```typescript
// Injection du service
constructor(private permissionService: PermissionService) {}

// Vérifications asynchrones
this.permissionService.canAccessUserManagement().subscribe(canAccess => {
  // Logique conditionnelle
});

// Vérifications synchrones (si rôle déjà connu)
const canSuspend = this.permissionService.hasMinimumRoleSync(userRole, UserRole.ADMIN);
```

### Méthodes disponibles

- `hasMinimumRole(role)` - Vérifie le niveau minimum
- `hasAnyRole(roles[])` - Vérifie si l'utilisateur a un des rôles
- `hasExactRole(role)` - Vérifie le rôle exact
- `canAccessUserManagement()` - Permissions spécifiques
- `canAccessModeration()` - Permissions de modération
- `canAccessSystemSettings()` - Paramètres système

## 🎨 Directive de Permissions

### HasPermissionDirective

Affiche/masque des éléments selon les permissions :

```html
<!-- Par rôle minimum -->
<div *appHasPermission="''; appHasPermissionMinRole='contributor'">Contenu pour contributeur et plus</div>

<!-- Par rôles spécifiques -->
<button *appHasPermission="''; appHasPermissionRoles='[admin, superadmin]'">Action admin</button>

<!-- Par rôle exact -->
<div *appHasPermission="''; appHasPermissionRole='superadmin'">Contenu superadmin uniquement</div>

<!-- Avec template alternatif -->
<div *appHasPermission="''; appHasPermissionMinRole='admin'; appHasPermissionElse='noAccess'">Contenu admin</div>
<ng-template #noAccess>
  <p>Accès refusé</p>
</ng-template>
```

## 📊 Composants

### AdminDashboardComponent

Tableau de bord adaptatif selon le rôle :

- **Contributeur** : Statistiques de modération
- **Admin** : Vue d'ensemble complète + activité récente
- **SuperAdmin** : Métriques système + contrôle total

### UserManagementComponent

Gestion des utilisateurs avec :

- Recherche et filtres
- Suspension/activation
- Changement de rôles (SuperAdmin uniquement)
- Actions en lot

## 🔄 Flux d'Authentification

1. **Connexion** → AuthService vérifie les credentials
2. **Accès admin** → AdminGuard vérifie le rôle minimum (CONTRIBUTOR)
3. **Route spécifique** → RoleGuard vérifie les permissions détaillées
4. **Composant** → PermissionService pour logique conditionnelle
5. **Template** → HasPermissionDirective pour affichage conditionnel

## 🚀 Utilisation

### Ajouter une nouvelle route protégée

```typescript
{
  path: 'nouvelle-section',
  component: NouvelleSectionComponent,
  canActivate: [RoleGuard],
  data: {
    minRole: UserRole.ADMIN,
    title: 'Nouvelle Section'
  }
}
```

### Vérifier les permissions dans un composant

```typescript
export class MonComposant {
  canEdit$ = this.permissionService.hasMinimumRole(UserRole.CONTRIBUTOR);

  constructor(private permissionService: PermissionService) {}
}
```

### Affichage conditionnel dans le template

```html
<button *appHasPermission="''; appHasPermissionMinRole='admin'" (click)="actionAdmin()">Action Administrateur</button>
```

## 🔧 Configuration

### Ajout d'une nouvelle permission

1. Ajouter la méthode dans `PermissionService`
2. Mettre à jour `getPermissionsForRole()`
3. Ajouter la vérification dans `AdminGuard` si nécessaire
4. Documenter la nouvelle permission

### Modification de la hiérarchie

Modifier `roleHierarchy` dans :

- `RoleGuard`
- `PermissionService`
- `AdminGuard`

## 📝 Bonnes Pratiques

1. **Toujours vérifier côté backend** - Les guards frontend sont pour l'UX, pas la sécurité
2. **Utiliser les observables** - Pour les vérifications réactives
3. **Préférer les directives** - Pour l'affichage conditionnel simple
4. **Centraliser les permissions** - Dans PermissionService
5. **Tester les redirections** - Vérifier les cas d'accès refusé

## 🐛 Dépannage

### Problèmes courants

- **Route non protégée** : Vérifier que les guards sont appliqués
- **Redirection incorrecte** : Vérifier la logique dans `handleUnauthorizedAccess`
- **Permissions incohérentes** : Synchroniser frontend/backend
- **Observable non souscrit** : Utiliser `async` pipe ou souscrire manuellement
