import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  HomeDataService,
  FeaturedWord,
  SiteStatistics,
} from '../../services/home-data.service';
import { Word } from '../../../../core/models/word';
import { Meaning } from '../../../../core/models/meaning';
import { Definition } from '../../../../core/models/definition';
import { DictionaryService } from '../../../../core/services/dictionary.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  featuredWords: FeaturedWord[] = [];
  statistics: SiteStatistics | null = null;
  searchQuery: string = '';

  constructor(
    private _homeDataService: HomeDataService,
    private _dictionaryService: DictionaryService
  ) {}

  ngOnInit(): void {
    this.loadFeaturedWords();
    this.loadStatistics();
  }

  loadFeaturedWords(): void {
    this._homeDataService
      .getFeaturedWords()
      .pipe(
        switchMap((words) => {
          // Créer un tableau de requêtes pour vérifier le statut des favoris
          const favoriteChecks = words.map((word) =>
            this._dictionaryService.checkIfFavorite(word.id).pipe(
              map((isFavorite) => ({
                ...word,
                isFavorite,
              }))
            )
          );
          // Combiner toutes les requêtes
          return forkJoin(favoriteChecks);
        })
      )
      .subscribe((wordsWithFavorites) => {
        this.featuredWords = wordsWithFavorites;
      });
  }

  loadStatistics(): void {
    this._homeDataService.getStatistics().subscribe((stats) => {
      this.statistics = stats;
    });
  }

  toggleFavorite(wordId: string): void {
    const wordIndex = this.featuredWords.findIndex(
      (word) => word.id === wordId
    );
    if (wordIndex === -1) return;

    const word = this.featuredWords[wordIndex];

    // Appeler le service de dictionnaire pour ajouter/supprimer des favoris
    if (word.isFavorite) {
      this._dictionaryService
        .removeFromFavorites(wordId)
        .subscribe((response) => {
          if (response.success) {
            this.featuredWords[wordIndex].isFavorite = false;
          }
        });
    } else {
      this._dictionaryService.addToFavorites(wordId).subscribe((response) => {
        if (response.success) {
          this.featuredWords[wordIndex].isFavorite = true;
        }
      });
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M+';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K+';
    }
    return num.toString();
  }

  // Convertir un FeaturedWord en Word pour le composant word-card
  convertToWordModel(featuredWord: FeaturedWord): Word {
    // Créer un objet Definition
    const definition: Definition = {
      id: `def_${featuredWord.id}`,
      meaningId: `meaning_${featuredWord.id}`,
      definition: featuredWord.definition,
      examples: [],
    };

    // Créer un objet Meaning
    const meaning: Meaning = {
      id: `meaning_${featuredWord.id}`,
      wordId: featuredWord.id,
      partOfSpeech: featuredWord.partOfSpeech,
      definitions: [definition],
      synonyms: [],
      antonyms: [],
      examples: [],
    };

    // Créer et retourner l'objet Word
    return {
      id: featuredWord.id,
      word: featuredWord.word,
      language: featuredWord.languageCode,
      pronunciation:
        featuredWord.pronunciation || `// (${featuredWord.partOfSpeech}.)`,
      createdAt: featuredWord.createdAt || new Date(),
      updatedAt: featuredWord.updatedAt || new Date(),
      status: 'approved',
      meanings: [meaning],
      isFavorite: featuredWord.isFavorite,
      createdBy: featuredWord.createdBy,
    };
  }
}
