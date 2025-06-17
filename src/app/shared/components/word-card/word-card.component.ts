import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Word } from '../../../core/models/word';
import { User } from '../../../core/models/user';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-word-card',
  standalone: false,
  templateUrl: './word-card.component.html',
  styleUrls: ['./word-card.component.scss'],
})
export class WordCardComponent implements OnInit {
  @Input() word!: Word;
  @Input() showLanguage = true;
  @Input() showDefinition = true;
  @Input() clickable = true;

  @Output() favoriteToggle = new EventEmitter<void>();

  arobase = '@';

  // Map pour stocker les catégories récupérées
  categoriesMap: Record<string, string> = {};

  // Options pour les langages
  languages = {
    fr: 'Français',
    en: 'Anglais',
    es: 'Espagnol',
    de: 'Allemand',
    it: 'Italien',
    pt: 'Portugais',
    ru: 'Russe',
    ja: 'Japonais',
    zh: 'Chinois',
  };

  // Options pour les parties du discours
  partsOfSpeech = {
    noun: 'Nom',
    verb: 'Verbe',
    adjective: 'Adjectif',
    adverb: 'Adverbe',
    pronoun: 'Pronom',
    preposition: 'Préposition',
    conjunction: 'Conjonction',
    interjection: 'Interjection',
  };

  // Abréviations pour les parties du discours
  partOfSpeechAbbr = {
    noun: 'n',
    verb: 'v',
    adjective: 'adj',
    adverb: 'adv',
    pronoun: 'pron',
    preposition: 'prep',
    conjunction: 'conj',
    interjection: 'interj',
  };

  // Avatars utilisateurs fictifs - à remplacer par une logique réelle
  private userAvatars = new Map<string, string>([
    ['wordsmith', '/assets/avatars/wordsmith.png'],
    ['professor_x', '/assets/avatars/professor.png'],
    ['linguist42', '/assets/avatars/linguist.png'],
    ['marshall', '/assets/avatars/marshall.png'],
  ]);
  constructor(
    private _dictionaryService: DictionaryService,
    private _router: Router,
    private _authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.word && this.word.language) {
      // Charger les catégories de la même langue que le mot
      this._dictionaryService
        .getCategories(this.word.language)
        .subscribe((categories) => {
          // Créer une map d'ID de catégorie vers nom de catégorie
          this.categoriesMap = categories.reduce((map, cat) => {
            map[cat._id] = cat.name;
            return map;
          }, {} as Record<string, string>);
        });
    }
  }

  // Naviguer vers la page de détails du mot
  navigateToDetails(): void {
    if (this.clickable && this.word && this.word.id) {
      this._router.navigate(['/dictionary/word', this.word.id]);
    }
  }

  //
  onFavoriteClick(event?: Event): void {
    if (event) {
      event.stopPropagation(); // Empêche le clic de se propager à la carte
    }

    // Vérifier si l'utilisateur est authentifié (via le service auth)
    if (!this._authService.isAuthenticated()) {
      // Redirectionner vers la page de connexion
      this._router.navigate(['/auth/login'], {
        queryParams: {
          returnUrl: this._router.url,
          message: 'Connectez-vous pour ajouter des mots à vos favoris',
        },
      });
      return;
    }

    // Toggle du statut favori
    this._dictionaryService.toggleFavorite(this.word).subscribe({
      next: (response) => {
        if (response.success) {
          // Inverser le statut local du favori
          this.word.isFavorite = !this.word.isFavorite;
          // Émettre l'événement
          this.favoriteToggle.emit();
        }
      },
      error: (error) => {
        console.error('Erreur lors du toggle du favori:', error);
      },
    });
  }

  getLanguageName(code: string): string {
    return this.languages[code as keyof typeof this.languages] || code;
  }

  getPartOfSpeechName(code: string): string {
    return this.partsOfSpeech[code as keyof typeof this.partsOfSpeech] || code;
  }

  getPartOfSpeechAbbr(code: string): string {
    return (
      this.partOfSpeechAbbr[code as keyof typeof this.partOfSpeechAbbr] || code
    );
  }

  getFirstDefinition(): string | null {
    if (
      this.word.meanings &&
      this.word.meanings.length > 0 &&
      this.word.meanings[0].definitions &&
      this.word.meanings[0].definitions.length > 0
    ) {
      const definition = this.word.meanings[0].definitions[0].definition;

      // Calcul de la longueur de la prononciation (avec les slashes et l'abréviation du part of speech)
      const pronunciation = this.word.pronunciation || this.getPhoneticsText();
      const partOfSpeech = this.getFirstPartOfSpeech();
      const partOfSpeechAbbr = partOfSpeech
        ? this.getPartOfSpeechAbbr(partOfSpeech)
        : '';

      // Calculer la longueur des éléments fixes (/prononciation/ (abbr.) - )
      const fixedPartsLength =
        7 + pronunciation.length + partOfSpeechAbbr.length; // 7 caractères pour "/ (.) - "

      // Calculer combien de caractères il reste pour la définition (sur 85 au total)
      const maxDefinitionLength = 85 - fixedPartsLength;

      // Tronquer la définition si nécessaire
      if (definition.length > maxDefinitionLength) {
        return definition.substring(0, maxDefinitionLength - 3) + '...';
      }

      return definition;
    }
    return null;
  }

  getFirstPartOfSpeech(): string | null {
    if (this.word.meanings && this.word.meanings.length > 0) {
      return this.word.meanings[0].partOfSpeech;
    }
    return null;
  }

  getPhoneticsText(): string {
    if (
      this.word.meanings &&
      this.word.meanings.length > 0 &&
      this.word.meanings[0].phonetics &&
      this.word.meanings[0].phonetics.length > 0
    ) {
      return this.word.meanings[0].phonetics[0].text;
    }
    return '';
  }

  getCategory(): string | null {
    // Si categoryId est défini
    if (this.word.categoryId) {
      // Si categoryId est un objet (après populate)
      if (typeof this.word.categoryId === 'object') {
        // Utiliser une assertion de type car TypeScript ne connaît pas la structure
        const categoryObj = this.word.categoryId as any;
        if (categoryObj && categoryObj.name) {
          return categoryObj.name;
        }
      }

      // Si categoryId est une chaîne (ID)
      if (
        typeof this.word.categoryId === 'string' &&
        this.categoriesMap[this.word.categoryId]
      ) {
        return this.categoriesMap[this.word.categoryId];
      }
    }

    // Fallback à un texte statique si aucune catégorie n'est trouvée
    return null;
  }

  getTimeAgo(date: Date | undefined): string {
    if (!date) return '';

    const now = new Date();
    const createdAt = new Date(date);
    const diffInMilliseconds = now.getTime() - createdAt.getTime();
    const diffInMinutes = diffInMilliseconds / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 60) {
      const minutes = Math.floor(diffInMinutes);
      return `Il y a ${minutes} mn`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `Il y a ${hours} h`;
    } else if (diffInDays < 30) {
      const days = Math.floor(diffInDays);
      return `Il y a ${days} j`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `Il y a ${months} mo`;
    }
  }

  getUserName(): string {
    // Vérifie si createdBy est un objet User
    if (this.word.createdBy && typeof this.word.createdBy === 'object') {
      // Essaie d'accéder à la propriété username
      const user = this.word.createdBy as unknown as User;
      return user.username || 'anonymous';
    }
    // Si c'est une chaîne de caractères
    else if (typeof this.word.createdBy === 'string') {
      return this.word.createdBy;
    }

    return 'anonymous';
  }

  userHasAvatar(): boolean {
    const username = this.getUserName();
    return this.userAvatars.has(username);
  }

  getUserAvatar(): string {
    const username = this.getUserName();
    return this.userAvatars.get(username) || '';
  }
}
