# 🌍 O'Ypunu - Dictionnaire Social Multilingue

[![Angular](https://img.shields.io/badge/Angular-19.1.0-red.svg)](https://angular.io/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-ea2845.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-010101.svg)](https://socket.io/)

> Une plateforme sociale de dictionnaire multilingue qui révolutionne l'apprentissage des langues en combinant la richesse d'un dictionnaire collaboratif avec les fonctionnalités d'un réseau social moderne.

## 📋 Table des Matières

- [✨ Aperçu du Projet](#-aperçu-du-projet)
- [🚀 Fonctionnalités Principales](#-fonctionnalités-principales)
- [🏗️ Architecture Technique](#️-architecture-technique)
- [🛠️ Technologies Utilisées](#️-technologies-utilisées)
- [📦 Installation](#-installation)
- [💻 Développement](#-développement)
- [📁 Structure du Projet](#-structure-du-projet)
- [🔗 API et Intégrations](#-api-et-intégrations)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

## ✨ Aperçu du Projet

**O'Ypunu** est une application web moderne qui transforme l'expérience d'apprentissage linguistique en combinant :

- 📚 **Dictionnaire collaboratif** avec définitions riches et exemples
- 🌐 **Communautés linguistiques** pour échanger et apprendre ensemble
- 💬 **Messagerie temps réel** pour partager des mots et discuter
- 👥 **Réseau social** pour connecter les passionnés de langues
- 🎯 **Système de favoris** pour organiser son apprentissage
- 🔊 **Prononciations audio** pour perfectionner l'accent

### 🎯 Mission

Démocratiser l'apprentissage linguistique en créant une communauté mondiale où chaque utilisateur contribue à enrichir la connaissance collective des langues.

## 🚀 Fonctionnalités Principales

### 📖 Dictionnaire Intelligent

- **Recherche avancée** avec filtres par langue, catégorie, partie du discours
- **Contributions communautaires** avec système de modération
- **Étymologies et prononciations** détaillées
- **Historique des révisions** pour la traçabilité
- **Upload audio** pour les prononciations natives

### 🌍 Communautés Linguistiques

- **Création de communautés** par langue ou thématique
- **Discussions thématiques** autour des mots et expressions
- **Système de modération** communautaire
- **Communautés privées/publiques** selon les besoins

### 💬 Messagerie Temps Réel

- **Chat instantané** avec Socket.io
- **Partage de mots** intégré dans les conversations
- **Indicateurs de frappe** et statuts de présence
- **Historique des conversations** persistant

### 👤 Profils et Social

- **Profils personnalisables** avec langues natives/apprises
- **Système de favoris** pour organiser les mots
- **Statistiques d'apprentissage** personnalisées
- **Réseau d'amis** pour l'apprentissage collaboratif

### 🛡️ Administration et Modération

- **Dashboard administrateur** avec métriques
- **Modération des contributions** (approbation/rejet)
- **Gestion des utilisateurs** et permissions
- **Système de rôles** granulaire

## 🏗️ Architecture Technique

### Frontend (Angular 19)

```
src/
├── app/
│   ├── core/              # Services centraux, guards, intercepteurs
│   ├── shared/            # Composants réutilisables
│   ├── features/          # Modules métier (lazy loading)
│   │   ├── auth/         # Authentification
│   │   ├── dictionary/   # Fonctionnalités dictionnaire
│   │   ├── communities/  # Gestion des communautés
│   │   ├── messaging/    # Chat temps réel
│   │   ├── admin/        # Administration
│   │   └── profile/      # Gestion des profils
│   └── pipes/            # Pipes personnalisés
```

### Backend (NestJS 11)

- **Architecture modulaire** avec séparation des responsabilités
- **MongoDB** avec Mongoose pour la persistance
- **Redis** pour le cache et les sessions WebSocket
- **JWT** pour l'authentification
- **Cloudinary** pour le stockage des médias
- **Socket.io** pour les communications temps réel

## 🛠️ Technologies Utilisées

### Frontend

| Technologie          | Version | Usage                    |
| -------------------- | ------- | ------------------------ |
| **Angular**          | 19.1.0  | Framework principal      |
| **TypeScript**       | 5.7.2   | Langage de développement |
| **TailwindCSS**      | 3.4.0   | Framework CSS            |
| **Socket.io Client** | 4.8.1   | Communication temps réel |
| **RxJS**             | 7.8.0   | Programmation réactive   |

### Backend

| Technologie    | Version | Usage             |
| -------------- | ------- | ----------------- |
| **NestJS**     | 11.0.1  | Framework Node.js |
| **MongoDB**    | 8.12.1  | Base de données   |
| **Redis**      | 5.6.1   | Cache et sessions |
| **Socket.io**  | 4.8.1   | WebSocket         |
| **Passport**   | 0.7.0   | Authentification  |
| **Cloudinary** | 2.6.1   | Stockage médias   |

## 📦 Installation

### Prérequis

- **Node.js** >= 18.x
- **npm** >= 9.x
- **MongoDB** (local ou cloud)
- **Redis** (optionnel, pour les fonctionnalités temps réel)

### Installation du Frontend

```bash
# Cloner le repository
git clone <repository-url>
cd oypunu-frontend

# Installer les dépendances
npm install

# Configurer l'environnement
cp src/environments/environment.ts src/environments/environment.local.ts
# Modifier l'URL de l'API selon votre configuration

# Lancer en développement
npm start
```

L'application sera accessible sur `http://localhost:4200`

### Variables d'Environnement

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api", // URL de votre API NestJS
};
```

## 💻 Développement

### Scripts Disponibles

```bash
# Développement avec hot reload
npm start

# Build de production
npm run build

# Tests unitaires
npm test

# Linting et formatage
npm run lint
```

### Développement avec le Backend

1. **Cloner et configurer le backend NestJS**
2. **Lancer MongoDB et Redis** (si utilisé)
3. **Démarrer l'API** : `npm run start:dev`
4. **Démarrer le frontend** : `npm start`

### Architecture des Guards

```typescript
// Exemple de protection de route
{
  path: 'admin',
  canActivate: [AuthGuard, AdminGuard],
  loadChildren: () => import('./features/admin/admin.module')
}
```

## 📁 Structure du Projet

### Modules Principaux

- **CoreModule** : Services singleton, guards, intercepteurs
- **SharedModule** : Composants partagés, pipes, directives
- **Feature Modules** : Modules métier avec lazy loading

### Services Centraux

- **AuthService** : Gestion complète de l'authentification
- **DictionaryService** : API dictionnaire avec cache intelligent
- **WebSocketService** : Gestion des connexions temps réel
- **MessagingService** : Logique de messagerie

### Composants Réutilisables

- **WordCard** : Affichage des mots avec actions
- **AudioRecorder** : Enregistrement de prononciations
- **CustomDropdown** : Sélecteurs personnalisés
- **RevisionHistory** : Historique des modifications

## 🔗 API et Intégrations

### Endpoints Principaux

```
GET    /api/words/search     # Recherche de mots
POST   /api/words           # Créer un mot
GET    /api/communities     # Lister les communautés
POST   /api/auth/login      # Authentification
GET    /api/messages        # Récupérer les messages
```

### Authentification

- **JWT Tokens** avec refresh automatique
- **OAuth Social** : Google, Facebook, Twitter
- **Vérification email** obligatoire
- **Récupération de mot de passe** sécurisée

### WebSocket Events

```typescript
// Événements en temps réel
"new_message"; // Nouveau message reçu
"user_typing"; // Utilisateur en train d'écrire
"user_online"; // Utilisateur connecté
"word_approved"; // Mot approuvé par un modérateur
```

## 🤝 Contribution

### Workflow de Développement

1. **Fork** le projet
2. **Créer une branche** : `git checkout -b feature/nouvelle-fonctionnalite`
3. **Commit** les changements : `git commit -m 'Ajout nouvelle fonctionnalité'`
4. **Push** la branche : `git push origin feature/nouvelle-fonctionnalite`
5. **Ouvrir une Pull Request**

### Standards de Code

- **TypeScript strict** activé
- **Prettier** pour le formatage
- **ESLint** pour la qualité du code
- **Tests unitaires** pour les nouvelles fonctionnalités

### Architecture des Composants

```typescript
// Exemple de composant typique
@Component({
  selector: "app-word-card",
  templateUrl: "./word-card.component.html",
  styleUrls: ["./word-card.component.scss"],
})
export class WordCardComponent implements OnInit {
  @Input() word!: Word;
  @Output() favoriteToggle = new EventEmitter<string>();

  // Logique du composant...
}
```

## 🚀 Déploiement

### Production Build

```bash
# Build optimisé pour la production
npm run build

# Les fichiers sont générés dans dist/
```

### Environnement de Production

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: "https://oypunu-production.up.railway.app/api",
};
```

## 📊 Fonctionnalités Avancées

### Gestion des États

- **BehaviorSubject** pour les données réactives
- **Local Storage** pour la persistance
- **Cache intelligent** pour les performances

### Internationalisation

- **Locale française** par défaut
- **Architecture prête** pour le multi-langue
- **Formatage des dates** localisé

### Performance

- **Lazy Loading** des modules
- **OnPush Change Detection** où approprié
- **Optimisation des bundles** avec Angular CLI

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👨‍💻 Auteur

**Chermann KING** - _Développeur Principal_

---

<div align="center">

**🌟 Si ce projet vous plaît, n'hésitez pas à lui donner une étoile ! 🌟**

_Fait avec ❤️ pour la communauté des passionnés de langues_

</div>
