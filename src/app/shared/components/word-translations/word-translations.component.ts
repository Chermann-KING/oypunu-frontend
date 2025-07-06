import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Word, WordTranslation } from '../../../core/models/word';
import { DictionaryService } from '../../../core/services/dictionary.service';

@Component({
  selector: 'app-word-translations',
  templateUrl: './word-translations.component.html',
  styleUrls: ['./word-translations.component.scss'],
  standalone: false
})
export class WordTranslationsComponent {
  @Input() word!: Word;

  constructor(
    private router: Router,
    private dictionaryService: DictionaryService
  ) {}

  // Langues disponibles avec leurs noms
  private languageNames: { [key: string]: string } = {
    fr: 'Français',
    en: 'Anglais',
    es: 'Espagnol',
    de: 'Allemand',
    it: 'Italien',
    pt: 'Portugais',
    ru: 'Russe',
    ja: 'Japonais',
    zh: 'Chinois',
    ar: 'Arabe',
    ko: 'Coréen',
    hi: 'Hindi'
  };

  /**
   * Récupère le nom complet d'une langue à partir de son code
   */
  getLanguageName(code: string): string {
    return this.languageNames[code] || code.toUpperCase();
  }

  /**
   * Récupère l'émoji du drapeau pour une langue
   */
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
      ar: '🇸🇦',
      ko: '🇰🇷',
      hi: '🇮🇳'
    };
    return flags[code] || '🌐';
  }

  /**
   * Vérifie si le mot a des traductions
   */
  hasTranslations(): boolean {
    return !!(this.word?.translations && this.word.translations.length > 0);
  }

  /**
   * Groupe les traductions par langue
   */
  getTranslationsByLanguage(): { [language: string]: WordTranslation[] } {
    if (!this.word?.translations) return {};

    return this.word.translations.reduce((grouped, translation) => {
      if (!grouped[translation.language]) {
        grouped[translation.language] = [];
      }
      grouped[translation.language].push(translation);
      return grouped;
    }, {} as { [language: string]: WordTranslation[] });
  }

  /**
   * Récupère les langues disponibles triées
   */
  getAvailableLanguages(): string[] {
    const grouped = this.getTranslationsByLanguage();
    return Object.keys(grouped).sort((a, b) => 
      this.getLanguageName(a).localeCompare(this.getLanguageName(b))
    );
  }

  /**
   * Formate les contextes pour affichage
   */
  formatContexts(contexts?: string[]): string {
    if (!contexts || contexts.length === 0) return '';
    return contexts.join(', ');
  }

  /**
   * Récupère la classe CSS pour le niveau de confiance
   */
  getConfidenceClass(confidence?: number): string {
    if (!confidence) return 'text-gray-400';
    
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  }

  /**
   * Formate le niveau de confiance pour affichage
   */
  formatConfidence(confidence?: number): string {
    if (!confidence) return '';
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Navigate vers la page de détail d'une traduction
   */
  navigateToTranslation(translatedWord: string, language: string): void {
    console.log(`🔍 Navigation vers: "${translatedWord}" en ${language}`);
    
    // Rechercher le mot traduit dans la langue spécifiée
    this.dictionaryService.searchWords({
      query: translatedWord,
      languages: [language],
      limit: 5,
      page: 1
    }).subscribe({
      next: (results) => {
        if (results.words && results.words.length > 0) {
          // Chercher une correspondance exacte
          const exactMatch = results.words.find(word => 
            word.word.toLowerCase() === translatedWord.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`✅ Correspondance exacte trouvée: ${exactMatch.id}`);
            this.router.navigate(['/dictionary/word', exactMatch.id]);
          } else {
            // Prendre le premier résultat si pas de correspondance exacte
            const foundWord = results.words[0];
            console.log(`✅ Mot similaire trouvé: ${foundWord.id}`);
            this.router.navigate(['/dictionary/word', foundWord.id]);
          }
        } else {
          // Mot non trouvé, faire une recherche générale
          console.log(`⚠️ Mot "${translatedWord}" non trouvé, redirection vers la recherche`);
          this.router.navigate(['/dictionary'], { 
            queryParams: { 
              q: translatedWord,
              language: language 
            } 
          });
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la recherche du mot traduit:', error);
        // En cas d'erreur, rediriger vers la recherche
        this.router.navigate(['/dictionary'], { 
          queryParams: { 
            q: translatedWord,
            language: language 
          } 
        });
      }
    });
  }
}