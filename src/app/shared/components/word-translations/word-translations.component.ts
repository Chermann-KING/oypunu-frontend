import { Component, Input } from '@angular/core';
import { Word, WordTranslation } from '../../../core/models/word';

@Component({
  selector: 'app-word-translations',
  templateUrl: './word-translations.component.html',
  styleUrls: ['./word-translations.component.scss'],
  standalone: false
})
export class WordTranslationsComponent {
  @Input() word!: Word;

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
}