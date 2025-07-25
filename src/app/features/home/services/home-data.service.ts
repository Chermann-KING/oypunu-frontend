import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FeaturedWord {
  createdBy: string;
  id: string;
  word: string;
  language: string;
  languageCode: string;
  partOfSpeech: string;
  definition: string;
  pronunciation: string;
  isFavorite: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SiteStatistics {
  activeUsers: number;
  definedWords: number;
  languages: number;
}

@Injectable({
  providedIn: 'root',
})
export class HomeDataService {
  private readonly _API_URL = `${environment.apiUrl}/home`;

  // Données de secours au cas où l'API échoue
  private _fallbackFeaturedWords: FeaturedWord[] = [
    {
      id: '1',
      word: 'Sérénité',
      language: 'Français',
      languageCode: 'fr',
      partOfSpeech: 'Nom',
      definition:
        'État de calme, de tranquillité, de confiance sur le plan moral.',
      pronunciation: '',
      isFavorite: false,
      createdBy: 'anonymous',
    },
    {
      id: '2',
      word: 'Wanderlust',
      language: 'Deutsch',
      languageCode: 'de',
      partOfSpeech: 'Name',
      definition: 'Ein starkes Verlangen zu reisen und die Welt zu erkunden.',
      pronunciation: '',
      isFavorite: true,
      createdBy: 'anonymous',
    },
    {
      id: '3',
      word: 'Hygge',
      language: 'Dansk',
      languageCode: 'da',
      partOfSpeech: 'Navn',
      definition:
        'En kvalitet af komfort og hygge, der fremkalder en følelse af velvære.',
      pronunciation: '',
      isFavorite: false,
      createdBy: 'anonymous',
    },
  ];

  private _fallbackStatistics: SiteStatistics = {
    activeUsers: 250000,
    definedWords: 1000000,
    languages: 50,
  };

  constructor(private _http: HttpClient) {}

  getFeaturedWords(): Observable<FeaturedWord[]> {
    return this._http
      .get<FeaturedWord[]>(`${this._API_URL}/featured-words`)
      .pipe(
        catchError((error) => {
          console.error(
            'Erreur lors de la récupération des mots en vedette:',
            error
          );
          // En cas d'erreur, utiliser les données de secours
          return of(this._fallbackFeaturedWords);
        })
      );
  }

  getStatistics(): Observable<SiteStatistics> {
    return this._http.get<SiteStatistics>(`${this._API_URL}/statistics`).pipe(
      catchError((error) => {
        console.error(
          'Erreur lors de la récupération des statistiques:',
          error
        );
        // En cas d'erreur, utiliser les données de secours
        return of(this._fallbackStatistics);
      })
    );
  }

  toggleFavorite(wordId: string): Observable<{ success: boolean }> {
    // Vous pouvez utiliser le service de dictionnaire existant pour cette fonctionnalité
    // Cette implémentation est simplifiée pour l'exemple
    return this._http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/words/${wordId}/favorite`,
        {}
      )
      .pipe(
        catchError((error) => {
          console.error(
            `Erreur lors du basculement du favori pour le mot ${wordId}:`,
            error
          );
          return of({ success: false });
        })
      );
  }
}
