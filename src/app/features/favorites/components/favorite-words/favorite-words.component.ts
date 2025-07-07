import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { Word } from '../../../../core/models/word';
import { DropdownOption } from '../../../../shared/components/custom-dropdown/custom-dropdown.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-favorite-words',
  standalone: false,
  templateUrl: './favorite-words.component.html',
  styleUrls: ['./favorite-words.component.scss'],
})
export class FavoriteWordsComponent implements OnInit, OnDestroy {
  favoriteWords: Word[] = [];
  isLoading = true;
  isShareModalOpen = false;
  currentWordId = '';
  errorMessage = '';

  // Options pour les langages (chargées dynamiquement)
  languages: { [key: string]: string } = {};
  availableLanguages: DropdownOption[] = [];

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

  // Options de filtre
  languageFilter: string | null = null;
  partOfSpeechFilter: string | null = null;

  // État de tri actuel
  currentSort: string = 'date';

  private _destroy$ = new Subject<void>();

  constructor(
    private _dictionaryService: DictionaryService,
    private _authService: AuthService
  ) {
    console.log('FavoriteWordsComponent constructor');
    console.log(
      'Utilisateur authentifié:',
      this._authService.isAuthenticated()
    );
  }

  ngOnInit(): void {
    console.log('FavoriteWordsComponent ngOnInit');
    console.log(
      'Utilisateur authentifié:',
      this._authService.isAuthenticated()
    );
    
    // Charger les langues disponibles d'abord
    this.loadAvailableLanguages();
    this.loadFavoriteWords();

    // S'abonner aux changements de favoris
    this._dictionaryService.favoriteWords$
      .pipe(takeUntil(this._destroy$))
      .subscribe((words) => {
        console.log('Mise à jour des favoris:', words);
        this.favoriteWords = words;
        this.isLoading = false;
        
        // Reconstruire les options de langues quand les favoris changent
        this.buildLanguageOptions();
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // Getter pour obtenir les options de tri au format DropdownOption
  get sortOptions(): DropdownOption[] {
    return [
      { value: 'date', label: "Date d'ajout (récent d'abord)" },
      { value: 'dateAsc', label: "Date d'ajout (ancien d'abord)" },
      { value: 'alpha', label: 'Ordre alphabétique (A-Z)' },
      { value: 'alphaDesc', label: 'Ordre alphabétique (Z-A)' },
      { value: 'language', label: 'Langue' },
    ];
  }

  // Méthode pour convertir les langues disponibles en options de dropdown
  getLanguageOptions(): DropdownOption[] {
    // Retourner directement la liste des langues chargées dynamiquement
    return this.availableLanguages;
  }

  // Méthode pour convertir les parties du discours en options de dropdown
  getPartOfSpeechOptions(): DropdownOption[] {
    const partsOfSpeech = this.getAvailablePartOfSpeech();

    // Ajouter l'option "Toutes"
    const options: DropdownOption[] = [{ value: '', label: 'Toutes' }];

    // Ajouter les parties du discours disponibles
    partsOfSpeech.forEach((pos) => {
      options.push({
        value: pos,
        label: this.getPartOfSpeechName(pos),
      });
    });

    return options;
  }

  // Méthode pour trier les favoris
  sortFavorites(option: string): void {
    this.currentSort = option;

    switch (option) {
      case 'date':
        this.favoriteWords.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'dateAsc':
        this.favoriteWords.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case 'alpha':
        this.favoriteWords.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'alphaDesc':
        this.favoriteWords.sort((a, b) => b.word.localeCompare(a.word));
        break;
      case 'language':
        this.favoriteWords.sort((a, b) => a.language.localeCompare(b.language));
        break;
    }
  }

  // Méthode pour filtrer les favoris
  filterFavorites(): Word[] {
    return this.favoriteWords.filter((word) => {
      // Filtrer par langue
      if (this.languageFilter && word.language !== this.languageFilter) {
        return false;
      }

      // Filtrer par partie du discours
      if (
        this.partOfSpeechFilter &&
        (!word.meanings ||
          !word.meanings.some(
            (m) => m.partOfSpeech === this.partOfSpeechFilter
          ))
      ) {
        return false;
      }

      return true;
    });
  }

  // Récupérer toutes les langues présentes dans les mots favoris
  getLanguagesInFavorites(): string[] {
    return [...new Set(this.favoriteWords.map((word) => word.language))];
  }

  // Récupérer toutes les parties du discours disponibles dans les favoris
  getAvailablePartOfSpeech(): string[] {
    const allPartOfSpeech = this.favoriteWords
      .flatMap((word) => word.meanings?.map((m) => m.partOfSpeech) || [])
      .filter(Boolean);

    return [...new Set(allPartOfSpeech)];
  }

  // Réinitialiser les filtres
  resetFilters(): void {
    this.languageFilter = null;
    this.partOfSpeechFilter = null;
  }

  loadAvailableLanguages(): void {
    console.log('🔄 Chargement des langues disponibles depuis la base de données...');
    
    this._dictionaryService
      .getAvailableLanguages()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (languages: any[]) => {
          console.log('✅ Langues disponibles récupérées:', languages);
          
          // Construire le dictionnaire des langues
          this.languages = {};
          languages.forEach((lang: any) => {
            const code = lang.code;
            this.languages[code] = lang.name;
          });
          
          // Les options de langues seront construites après le chargement des favoris
          // pour pouvoir compter les favoris par langue
          this.buildLanguageOptions();
          
          console.log('🎯 Dictionnaire des langues construit:', this.languages);
        },
        error: (error: any) => {
          console.error('❌ Erreur lors du chargement des langues:', error);
          // Fallback vers langues par défaut si l'API échoue
          this.languages = {
            fr: 'Français',
            en: 'Anglais',
            es: 'Espagnol',
            de: 'Allemand'
          };
          this.buildLanguageOptions();
        }
      });
  }

  private buildLanguageOptions(): void {
    // Compter les favoris par langue
    const favoritesByLanguage: { [key: string]: number } = {};
    this.favoriteWords.forEach(word => {
      const lang = word.language;
      favoritesByLanguage[lang] = (favoritesByLanguage[lang] || 0) + 1;
    });

    console.log('📊 Favoris par langue:', favoritesByLanguage);

    // Construire les options du dropdown avec les comptages de favoris
    this.availableLanguages = [];
    
    // Ajouter seulement les langues qui ont des favoris
    Object.keys(favoritesByLanguage).forEach(langCode => {
      const langName = this.languages[langCode] || langCode;
      const count = favoritesByLanguage[langCode];
      const flag = this.getLanguageFlag(langCode);
      
      this.availableLanguages.push({
        label: `${flag} ${langName} (${count} favoris)`,
        value: langCode
      });
    });

    // Trier par nombre de favoris (décroissant)
    this.availableLanguages.sort((a, b) => {
      const countA = parseInt(a.label.match(/\((\d+) favoris\)/)?.[1] || '0');
      const countB = parseInt(b.label.match(/\((\d+) favoris\)/)?.[1] || '0');
      return countB - countA;
    });

    // Ajouter l'option "Toutes les langues" au début
    const totalFavorites = this.favoriteWords.length;
    this.availableLanguages.unshift({
      label: `🌍 Toutes les langues (${totalFavorites} favoris)`,
      value: ''
    });

    console.log('🎯 Options de langues avec comptages:', this.availableLanguages);
  }

  loadFavoriteWords(): void {
    console.log('Chargement des mots favoris');
    this.isLoading = true;
    this._dictionaryService
      .getFavoriteWords()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (words) => {
          console.log('Favoris récupérés:', words);
          this.favoriteWords = words;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading favorite words:', error);
          this.errorMessage =
            'Une erreur est survenue lors du chargement de vos mots favoris';
          this.isLoading = false;
        },
      });
  }

  removeFromFavorites(word: Word): void {
    console.log(`🔥 Component: Tentative de suppression du mot ${word.id} (${word.word})`);
    
    // L'état local sera mis à jour immédiatement par la mise à jour optimiste
    this._dictionaryService
      .removeFromFavorites(word.id)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response) => {
          console.log(`🔥 Component: Réponse removeFromFavorites:`, response);
          if (response.success) {
            console.log(`🔥 Component: Suppression confirmée par API`);
          } else {
            console.log(`🔥 Component: Suppression échouée, état restauré automatiquement`);
          }
        },
        error: (error) => {
          console.error(`🔥 Component: Erreur lors de la suppression (état restauré):`, error);
        }
      });
  }

  // Implémenter le partage de mot
  shareWord(word: Word): void {
    this.currentWordId = word.id;
    this.isShareModalOpen = true;
  }

  // Ajouter ces nouvelles méthodes
  closeShareModal(): void {
    this.isShareModalOpen = false;
  }

  shareWithUser(username: string): void {
    if (!username || !this.currentWordId) return;

    this._dictionaryService.shareWord(this.currentWordId, username).subscribe({
      next: (response) => {
        if (response.success) {
          // Vous pourriez ajouter une notification ici
          console.log(`Mot partagé avec succès avec ${username}`);
        } else {
          console.error(`Erreur lors du partage: ${response.message}`);
        }
        this.closeShareModal();
      },
      error: (error) => {
        console.error('Erreur lors du partage:', error);
        this.closeShareModal();
      },
    });
  }

  getLanguageName(code: string): string {
    return this.languages[code as keyof typeof this.languages] || code;
  }

  getPartOfSpeechName(code: string): string {
    return this.partsOfSpeech[code as keyof typeof this.partsOfSpeech] || code;
  }

  getLanguageFlag(code: string): string {
    const flags: { [key: string]: string } = {
      fr: '🇫🇷',
      en: '🇺🇸',
      es: '🇪🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      ru: '🇷🇺',
      ja: '🇯🇵',
      zh: '🇨🇳',
      zu: '🇿🇦',
      da: '🇩🇰'
    };
    return flags[code] || '🌐';
  }
}
