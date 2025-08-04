# Système de Contrôle d'Accès Basé sur les Rôles (RBAC)

## Vue d'ensemble

Le système RBAC d'O'Ypunu permet de contrôler l'accès aux différentes fonctionnalités en fonction des rôles et permissions des utilisateurs. Il est composé de plusieurs éléments :

- **Rôles hiérarchiques** : USER, CONTRIBUTOR, ADMIN, SUPERADMIN
- **Permissions granulaires** : canViewUsers, canModerateContent, etc.
- **Guards de route** : Protection des routes selon les rôles/permissions
- **Directives de template** : Affichage conditionnel dans les templates
- **Services de vérification** : Vérification programmatique des permissions

## Hiérarchie des Rôles

```
USER (0)
└── CONTRIBUTOR (1)
    └── ADMIN (2)
        └── SUPERADMIN (3)
```

Un utilisateur avec un rôle supérieur hérite des permissions des rôles inférieurs.

## Permissions par Rôle

### USER
- Accès basique à la plateforme
- Aucune permission administrative

### CONTRIBUTOR
- `canModerateContent` : Peut modérer les mots soumis
- `canViewAnalytics` : Peut voir les analytics de base

### ADMIN
- Toutes les permissions CONTRIBUTOR +
- `canViewUsers` : Voir la liste des utilisateurs
- `canEditUsers` : Modifier les profils utilisateurs
- `canSuspendUsers` : Suspendre des utilisateurs
- `canManageCommunities` : Gérer les communautés
- `canManageLanguages` : Gérer les langues
- `canExportData` : Exporter des données

### SUPERADMIN
- Toutes les permissions ADMIN +
- `canChangeUserRoles` : Modifier les rôles des utilisateurs
- `canViewSystemMetrics` : Voir les métriques système
- `canViewLogs` : Accéder aux logs système
- `canManageSystem` : Gérer les paramètres système

## Utilisation

### 1. Guards de Route

#### AdminRoleGuard
Protège les routes en fonction des rôles et permissions :

```typescript
// admin-routing.module.ts
{
  path: 'users',
  component: UserManagementComponent,
  canActivate: [AdminRoleGuard],
  data: {
    role: UserRole.ADMIN,
    permission: 'canViewUsers',
    title: 'Gestion des utilisateurs'
  }
}
```

### 2. Directive de Template

#### *appHasPermission
Contrôle l'affichage des éléments selon les permissions :

```html
<!-- Affichage basé sur une permission -->
<div *appHasPermission="'canViewUsers'">
  Contenu visible seulement pour ceux qui peuvent voir les utilisateurs
</div>

<!-- Affichage basé sur le rôle -->
<div *appHasRole="UserRole.ADMIN">
  Contenu visible pour les admins et superadmins
</div>

<!-- Permissions multiples (OR par défaut) -->
<div *appHasPermission="['canViewUsers', 'canEditUsers']">
  Visible si AU MOINS UNE permission est présente
</div>

<!-- Permissions multiples (AND) -->
<div *appHasPermission="['canViewUsers', 'canEditUsers']" [appRequireAll]="true">
  Visible si TOUTES les permissions sont présentes
</div>
```

### 3. Service RolePermissionService

#### Vérification des permissions dans le composant

```typescript
export class MyComponent {
  constructor(private rolePermissionService: RolePermissionService) {}

  // Vérifier une permission
  canEditUsers$ = this.rolePermissionService.hasPermission('canEditUsers');

  // Vérifier plusieurs permissions
  canManageUsers$ = this.rolePermissionService.hasPermissions(
    ['canViewUsers', 'canEditUsers'], 
    true // requireAll
  );

  // Vérifier le rôle
  isAdmin$ = this.rolePermissionService.hasMinimumRole(UserRole.ADMIN);

  // Obtenir le rôle actuel
  currentRole$ = this.rolePermissionService.getCurrentUserRole();
}
```

### 4. ComprehensiveAdminService

#### Gestion des permissions utilisateur

```typescript
export class UserManagementComponent {
  constructor(private adminService: ComprehensiveAdminService) {}

  // Changer le rôle d'un utilisateur
  changeUserRole(userId: string, newRole: UserRole) {
    return this.adminService.updateUserRole(userId, newRole);
  }

  // Obtenir les permissions actuelles
  getUserPermissions() {
    return this.adminService.getUserPermissions();
  }
}
```

## Composants Utilitaires

### UserPermissionsComponent

Composant pour afficher et gérer les permissions d'un utilisateur :

```html
<app-user-permissions [user]="selectedUser"></app-user-permissions>
```

Ce composant affiche :
- Les permissions actuelles de l'utilisateur
- La possibilité de changer le rôle (si autorisé)
- L'historique des modifications de permissions

## Sécurité

### Règles de Sécurité

1. **Vérification côté client ET serveur** : Les permissions sont vérifiées dans le frontend pour l'UX, mais TOUJOURS validées côté serveur
2. **Hiérarchie respectée** : Un utilisateur ne peut pas s'assigner un rôle supérieur au sien
3. **Permissions granulaires** : Chaque action sensible est protégée par une permission spécifique
4. **Logs d'audit** : Toutes les modifications de permissions sont loggées

### Bonnes Pratiques

1. **Principe du moindre privilège** : Accordez uniquement les permissions nécessaires
2. **Vérification systématique** : Vérifiez les permissions à chaque action sensible
3. **Feedback utilisateur** : Affichez des messages clairs quand l'accès est refusé
4. **Cache intelligent** : Les permissions sont mises en cache mais rafraîchies régulièrement

## Exemples d'Utilisation Avancés

### Navigation Conditionnelle

```typescript
// app.component.ts
export class AppComponent {
  navigationItems$ = this.rolePermissionService.getCurrentUserRole().pipe(
    map(role => this.getNavigationForRole(role))
  );

  private getNavigationForRole(role: UserRole) {
    const items = [
      { 
        label: 'Dashboard', 
        route: '/admin/dashboard',
        minRole: UserRole.CONTRIBUTOR 
      },
      { 
        label: 'Utilisateurs', 
        route: '/admin/users',
        permission: 'canViewUsers'
      },
      { 
        label: 'Système', 
        route: '/admin/system',
        permission: 'canViewSystemMetrics'
      }
    ];

    return items.filter(item => 
      this.hasAccessToItem(item, role)
    );
  }
}
```

### Formulaires Dynamiques

```typescript
// dynamic-form.component.ts
export class DynamicFormComponent {
  formFields$ = combineLatest([
    this.rolePermissionService.getCurrentUserRole(),
    this.rolePermissionService.getCurrentUserPermissions()
  ]).pipe(
    map(([role, permissions]) => this.getFieldsForUser(role, permissions))
  );

  private getFieldsForUser(role: UserRole, permissions: AdminPermissions) {
    const fields = [];
    
    if (permissions.canEditUsers) {
      fields.push({ name: 'username', type: 'text', required: true });
      fields.push({ name: 'email', type: 'email', required: true });
    }
    
    if (permissions.canChangeUserRoles) {
      fields.push({ 
        name: 'role', 
        type: 'select', 
        options: this.getAvailableRoles(role) 
      });
    }
    
    return fields;
  }
}
```

## Tests

### Test des Guards

```typescript
describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthService', ['currentUser$']);
    
    TestBed.configureTestingModule({
      providers: [
        AdminRoleGuard,
        { provide: AuthService, useValue: spy }
      ]
    });
    
    guard = TestBed.inject(AdminRoleGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should allow access for admin users', () => {
    const user = { role: UserRole.ADMIN };
    authService.currentUser$.and.returnValue(of(user));
    
    const route = { data: { role: UserRole.ADMIN } } as any;
    
    guard.canActivate(route, {} as any).subscribe(result => {
      expect(result).toBe(true);
    });
  });
});
```

### Test des Directives

```typescript
describe('HasPermissionDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  @Component({
    template: `
      <div *appHasPermission="'canViewUsers'" id="test-element">
        Test Content
      </div>
    `
  })
  class TestComponent {}

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [HasPermissionDirective]
    });
    
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  it('should show element when user has permission', () => {
    // Setup permission service to return true
    fixture.detectChanges();
    
    const element = fixture.debugElement.query(By.css('#test-element'));
    expect(element).toBeTruthy();
  });
});
```

## Dépannage

### Problèmes Courants

1. **Permissions non mises à jour** : Vérifiez que le cache est rafraîchi après modification
2. **Directive ne fonctionne pas** : Assurez-vous d'importer `HasPermissionDirective`
3. **Guard bloque incorrectement** : Vérifiez la configuration des routes et les données

### Logs de Debug

Activez les logs de debug dans le service :

```typescript
// environment.ts
export const environment = {
  production: false,
  enablePermissionLogs: true
};
```

Les logs aideront à identifier les problèmes de permissions et de rôles.