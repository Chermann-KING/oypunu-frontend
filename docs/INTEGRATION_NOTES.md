# 🔗 Notes d'intégration : Liens emails vers l'interface de modération

## 📧 Format des liens emails pour les administrateurs

Pour une expérience utilisateur optimale, les emails envoyés aux administrateurs doivent utiliser le nouveau format d'URL qui ouvre directement la demande de contributeur dans l'interface de modération unifiée.

### ✅ **Nouveau format recommandé (Interface unifiée)**

```
https://oypunu-frontend.vercel.app/admin/moderation?type=contributor_request&id={requestId}
```

**Exemple concret :**

```
https://oypunu-frontend.vercel.app/admin/moderation?type=contributor_request&id=68a7427892bdc1be97f15542
```

### ❌ **Ancien format (à éviter)**

```
https://oypunu-frontend.vercel.app/admin/contributor-requests/{id}
```

## 🎯 **Comportement attendu**

Quand l'admin clique sur le lien dans l'email :

1. **Redirection** vers `/admin/moderation`
2. **Sélection automatique** de la catégorie "Demandes de Contributeur"
3. **Ouverture automatique** du modal avec les détails de la demande spécifique
4. **Interface unifiée** cohérente avec le reste de la modération

## 🛠️ **Modification requise dans le backend**

### Fichier à modifier :

`/oypunu-backend/src/users/listeners/contributor-request.listener.ts`

### Méthode concernée :

`sendAdminNewContributorRequest()` dans le `MailService`

### Changement à effectuer :

Modifier le template d'email pour utiliser la nouvelle URL :

```typescript
// AVANT
const adminUrl = `${this.configService.get("FRONTEND_URL")}/admin/contributor-requests/${requestId}`;

// APRÈS
const adminUrl = `${this.configService.get("FRONTEND_URL")}/admin/moderation?type=contributor_request&id=${requestId}`;
```

## 📋 **Paramètres URL supportés**

- `type=contributor_request` : Sélectionne automatiquement la catégorie des demandes de contributeur
- `id={requestId}` : Ouvre automatiquement le modal pour cette demande spécifique

## ✅ **Statut d'implémentation**

- [x] Frontend : Support des paramètres URL implémenté
- [x] Frontend : Interface de modération unifiée fonctionnelle
- [x] Backend : Mise à jour des templates d'emails

---

**Note :** Cette intégration assure une expérience utilisateur cohérente où tous les types de contenu à modérer (mots, langues, catégories, demandes de contributeur) sont accessibles depuis la même interface.
