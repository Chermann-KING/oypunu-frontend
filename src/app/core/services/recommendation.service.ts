import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Types
import {
  RecommendedWord,
  RecommendationsResponse,
  RecommendationFeedback,
  FeedbackResponse,
  RecommendationExplanation,
  RecommendationStats,
  RecommendationPreferences,
  TrendingRecommendationsParams,
  LinguisticRecommendationsParams,
  PersonalRecommendationsParams,
  RecommendationHistory,
  RecommendationWithConfidence,
  RecommendationConfidence
} from '../models/recommendation';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = `${environment.apiUrl}/recommendations`;
  
  // État local pour optimiser les performances
  private _lastRecommendations = new BehaviorSubject<RecommendedWord[]>([]);
  private _recommendationHistory = new BehaviorSubject<RecommendationHistory[]>([]);
  private _userStats = new BehaviorSubject<RecommendationStats | null>(null);
  
  // Cache des recommandations pour éviter les appels répétés
  private cache = new Map<string, { data: RecommendationsResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Observables publics
  public lastRecommendations$ = this._lastRecommendations.asObservable();
  public recommendationHistory$ = this._recommendationHistory.asObservable();
  public userStats$ = this._userStats.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserStats();
  }

  /**
   * Obtenir des recommandations personnalisées
   */
  getPersonalRecommendations(params: PersonalRecommendationsParams = {}): Observable<RecommendationsResponse> {
    console.log('🎯 Service: Demande de recommandations personnalisées', params);

    const cacheKey = `personal_${JSON.stringify(params)}`;
    
    // Vérifier le cache si refresh n'est pas demandé
    if (!params.refresh && this.isCacheValid(cacheKey)) {
      console.log('📋 Service: Recommandations trouvées en cache');
      const cached = this.cache.get(cacheKey)!;
      this._lastRecommendations.next(cached.data.recommendations);
      return of(cached.data);
    }

    let httpParams = new HttpParams();
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.languages?.length) {
      params.languages.forEach(lang => {
        httpParams = httpParams.append('languages', lang);
      });
    }
    if (params.categories?.length) {
      params.categories.forEach(cat => {
        httpParams = httpParams.append('categories', cat);
      });
    }
    if (params.refresh) httpParams = httpParams.set('refresh', 'true');

    return this.http.get<RecommendationsResponse>(`${this.apiUrl}/personal`, { params: httpParams }).pipe(
      tap(response => {
        console.log('✅ Service: Recommandations reçues', response);
        this.cache.set(cacheKey, { data: response, timestamp: Date.now() });
        this._lastRecommendations.next(response.recommendations);
        this.addToHistory(response);
      }),
      catchError(error => {
        console.error('❌ Service: Erreur lors de la récupération des recommandations', error);
        return throwError(() => new Error('Erreur lors du chargement des recommandations'));
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtenir des recommandations tendance
   */
  getTrendingRecommendations(params: TrendingRecommendationsParams = {}): Observable<RecommendationsResponse> {
    console.log('📈 Service: Demande de recommandations tendance', params);

    let httpParams = new HttpParams();
    if (params.region) httpParams = httpParams.set('region', params.region);
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.period) httpParams = httpParams.set('period', params.period);

    return this.http.get<RecommendationsResponse>(`${this.apiUrl}/trending`, { params: httpParams }).pipe(
      tap(response => {
        console.log('✅ Service: Recommandations tendance reçues', response);
        this.addToHistory(response);
      }),
      catchError(error => {
        console.error('❌ Service: Erreur recommandations tendance', error);
        return throwError(() => new Error('Erreur lors du chargement des tendances'));
      })
    );
  }

  /**
   * Obtenir des recommandations linguistiques
   */
  getLinguisticRecommendations(params: LinguisticRecommendationsParams): Observable<RecommendationsResponse> {
    console.log('🌍 Service: Demande de recommandations linguistiques', params);

    let httpParams = new HttpParams();
    if (params.level) httpParams = httpParams.set('level', params.level.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<RecommendationsResponse>(`${this.apiUrl}/linguistic/${params.language}`, { params: httpParams }).pipe(
      tap(response => {
        console.log('✅ Service: Recommandations linguistiques reçues', response);
        this.addToHistory(response);
      }),
      catchError(error => {
        console.error('❌ Service: Erreur recommandations linguistiques', error);
        return throwError(() => new Error('Erreur lors du chargement des recommandations linguistiques'));
      })
    );
  }

  /**
   * Enregistrer un feedback sur une recommandation
   */
  provideFeedback(feedback: RecommendationFeedback): Observable<FeedbackResponse> {
    console.log('📝 Service: Envoi de feedback', feedback);

    return this.http.post<FeedbackResponse>(`${this.apiUrl}/feedback`, feedback).pipe(
      tap(response => {
        console.log('✅ Service: Feedback enregistré', response);
        
        // Invalider le cache pour forcer une régénération
        this.clearCache();
        
        // Mettre à jour l'historique avec le feedback
        this.updateHistoryWithFeedback(feedback);
        
        // Recharger les stats utilisateur
        this.loadUserStats();
      }),
      catchError(error => {
        console.error('❌ Service: Erreur lors de l\'enregistrement du feedback', error);
        return throwError(() => new Error('Erreur lors de l\'enregistrement du feedback'));
      })
    );
  }

  /**
   * Obtenir une explication détaillée d'une recommandation
   */
  explainRecommendation(wordId: string): Observable<RecommendationExplanation> {
    console.log('🔍 Service: Demande d\'explication pour le mot', wordId);

    return this.http.get<RecommendationExplanation>(`${this.apiUrl}/explain/${wordId}`).pipe(
      catchError(error => {
        console.error('❌ Service: Erreur lors de l\'explication', error);
        return throwError(() => new Error('Erreur lors de l\'explication de la recommandation'));
      })
    );
  }

  /**
   * Obtenir les statistiques des recommandations
   */
  getRecommendationStats(): Observable<RecommendationStats> {
    return this.http.get<RecommendationStats>(`${this.apiUrl}/stats`).pipe(
      tap(stats => {
        console.log('📊 Service: Statistiques reçues', stats);
        this._userStats.next(stats);
      }),
      catchError(error => {
        console.error('❌ Service: Erreur lors du chargement des statistiques', error);
        return throwError(() => new Error('Erreur lors du chargement des statistiques'));
      })
    );
  }

  /**
   * Mettre à jour les préférences de recommandations
   */
  updatePreferences(preferences: RecommendationPreferences): Observable<{ success: boolean; message: string }> {
    console.log('⚙️ Service: Mise à jour des préférences', preferences);

    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/preferences`, preferences).pipe(
      tap(response => {
        console.log('✅ Service: Préférences mises à jour', response);
        this.clearCache(); // Invalider le cache pour appliquer les nouvelles préférences
      }),
      catchError(error => {
        console.error('❌ Service: Erreur lors de la mise à jour des préférences', error);
        return throwError(() => new Error('Erreur lors de la mise à jour des préférences'));
      })
    );
  }

  /**
   * Obtenir des recommandations pour découvrir de nouvelles langues
   */
  discoverLanguages(limit: number = 3): Observable<any> {
    let httpParams = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/discover-languages`, { params: httpParams }).pipe(
      catchError(error => {
        console.error('❌ Service: Erreur lors de la découverte de langues', error);
        return throwError(() => new Error('Erreur lors de la découverte de langues'));
      })
    );
  }

  /**
   * Obtenir des recommandations contextuelles
   */
  getContextualRecommendations(params: PersonalRecommendationsParams = {}): Observable<RecommendationsResponse> {
    console.log('🎭 Service: Demande de recommandations contextuelles', params);

    let httpParams = new HttpParams();
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.type) httpParams = httpParams.set('type', params.type);

    return this.http.get<RecommendationsResponse>(`${this.apiUrl}/contextual`, { params: httpParams }).pipe(
      tap(response => {
        console.log('✅ Service: Recommandations contextuelles reçues', response);
        this.addToHistory(response);
      }),
      catchError(error => {
        console.error('❌ Service: Erreur recommandations contextuelles', error);
        return throwError(() => new Error('Erreur lors du chargement des recommandations contextuelles'));
      })
    );
  }

  // ======= MÉTHODES UTILITAIRES =======

  /**
   * Enrichir les recommandations avec des métadonnées supplémentaires
   */
  enrichRecommendations(recommendations: RecommendedWord[]): RecommendationWithConfidence[] {
    return recommendations.map(rec => {
      const confidence = this.calculateConfidence(rec);
      const freshness = this.determineFreshness(rec);
      
      return {
        ...rec,
        confidence,
        confidenceReason: this.getConfidenceReason(rec, confidence),
        isPersonalized: rec.category === 'behavioral' || rec.category === 'mixed',
        freshness
      };
    });
  }

  /**
   * Calculer le niveau de confiance d'une recommandation
   */
  private calculateConfidence(recommendation: RecommendedWord): RecommendationConfidence {
    const score = recommendation.score;
    const reasonsCount = recommendation.reasons.length;
    
    if (score >= 0.9 && reasonsCount >= 3) return RecommendationConfidence.VERY_HIGH;
    if (score >= 0.7 && reasonsCount >= 2) return RecommendationConfidence.HIGH;
    if (score >= 0.5) return RecommendationConfidence.MEDIUM;
    return RecommendationConfidence.LOW;
  }

  /**
   * Obtenir la raison du niveau de confiance
   */
  private getConfidenceReason(recommendation: RecommendedWord, confidence: RecommendationConfidence): string {
    switch (confidence) {
      case RecommendationConfidence.VERY_HIGH:
        return 'Excellente correspondance avec vos intérêts';
      case RecommendationConfidence.HIGH:
        return 'Forte correspondance avec votre profil';
      case RecommendationConfidence.MEDIUM:
        return 'Correspondance modérée avec vos préférences';
      case RecommendationConfidence.LOW:
        return 'Exploration de nouveaux domaines';
      default:
        return 'Recommandation standard';
    }
  }

  /**
   * Déterminer la fraîcheur d'une recommandation
   */
  private determineFreshness(recommendation: RecommendedWord): 'new' | 'recent' | 'trending' | 'classic' {
    if (recommendation.metadata?.['isNew']) return 'new';
    if (recommendation.category === 'community') return 'trending';
    if (recommendation.metadata?.['daysSinceCreation'] <= 30) return 'recent';
    return 'classic';
  }

  /**
   * Vérifier si le cache est valide
   */
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    return (Date.now() - cached.timestamp) < this.CACHE_DURATION;
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    console.log('🗑️ Service: Vidage du cache des recommandations');
    this.cache.clear();
  }

  /**
   * Ajouter une réponse à l'historique
   */
  private addToHistory(response: RecommendationsResponse): void {
    const history: RecommendationHistory = {
      id: `${Date.now()}_${response.type}`,
      recommendations: response.recommendations,
      generatedAt: new Date(response.timestamp),
      type: response.type,
      performance: {
        viewRate: 0,
        clickRate: 0,
        favoriteRate: 0
      }
    };

    const currentHistory = this._recommendationHistory.value;
    const updatedHistory = [history, ...currentHistory].slice(0, 20); // Garder seulement les 20 dernières
    this._recommendationHistory.next(updatedHistory);
  }

  /**
   * Mettre à jour l'historique avec le feedback
   */
  private updateHistoryWithFeedback(feedback: RecommendationFeedback): void {
    const currentHistory = this._recommendationHistory.value;
    const updatedHistory = currentHistory.map(entry => {
      if (entry.recommendations.some(rec => rec.id === feedback.wordId)) {
        return {
          ...entry,
          userFeedback: {
            ...entry.userFeedback,
            [feedback.wordId]: feedback
          }
        };
      }
      return entry;
    });
    
    this._recommendationHistory.next(updatedHistory);
  }

  /**
   * Charger les statistiques utilisateur
   */
  private loadUserStats(): void {
    this.getRecommendationStats().subscribe({
      next: (stats) => {
        // Les stats sont déjà mises à jour dans le tap
      },
      error: (error) => {
        console.warn('⚠️ Service: Impossible de charger les statistiques utilisateur');
      }
    });
  }

  /**
   * Obtenir des recommandations par défaut en cas d'erreur
   */
  getFallbackRecommendations(): RecommendedWord[] {
    return [
      {
        id: 'fallback_1',
        word: 'ubuntu',
        language: 'zu',
        languageName: 'Zulu',
        languageFlag: '🇿🇦',
        definition: 'Philosophie sud-africaine de l\'humanité et de la bienveillance',
        score: 0.8,
        reasons: ['Mot populaire', 'Concept philosophique intéressant'],
        category: 'community',
        examples: ['Ubuntu signifie "je suis parce que nous sommes"'],
        metadata: { isFallback: true }
      },
      {
        id: 'fallback_2',
        word: 'saudade',
        language: 'pt',
        languageName: 'Portugais',
        languageFlag: '🇵🇹',
        definition: 'Sentiment de nostalgie et de mélancolie douce',
        score: 0.75,
        reasons: ['Concept unique', 'Émotion universelle'],
        category: 'semantic',
        examples: ['Il ressent une profonde saudade de son pays natal'],
        metadata: { isFallback: true }
      }
    ];
  }

  /**
   * Nettoyer les ressources
   */
  ngOnDestroy(): void {
    this._lastRecommendations.complete();
    this._recommendationHistory.complete();
    this._userStats.complete();
  }
}