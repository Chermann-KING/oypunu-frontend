import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Word } from '../models/word';
import { SearchParams } from '../models/search-params';
import { SearchResults } from '../models/search-results';
import { Category } from '../models/category';
import { AuthService } from './auth.service';
import { GuestLimitsService } from './guest-limits.service';

interface MongoDBWord extends Omit<Word, 'id'> {
  _id: string;
}

interface MongoDBCategory {
  _id: string;
  name: string;
  description?: string;
  language: string;
}

// Interfaces pour les révisions
export interface UpdateWordDto {
  pronunciation?: string;
  etymology?: string;
  meanings?: any[];
  translations?: any[];
  revisionNotes?: string;
  forceRevision?: boolean;
}

export interface RevisionHistory {
  _id: string;
  wordId: string;
  version: number;
  previousVersion: any;
  modifiedBy: any;
  modifiedAt: Date;
  changes: any[];
  status: 'pending' | 'approved' | 'rejected';
  adminApprovedBy?: any;
  adminApprovedAt?: Date;
  adminNotes?: string;
  rejectionReason?: string;
}

export interface EditPermissionsResponse {
  canEdit: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  // URLs de l'API
  private readonly _WORDS_API_URL = `${environment.apiUrl}/words`;
  private readonly _CATEGORIES_API_URL = `${environment.apiUrl}/categories`;

  private _recentSearches: BehaviorSubject<string[]> = new BehaviorSubject<
    string[]
  >([]);
  private _favoriteWords: BehaviorSubject<Word[]> = new BehaviorSubject<Word[]>(
    []
  );
  private _favoriteWordIds: BehaviorSubject<Set<string>> = new BehaviorSubject<Set<string>>(
    new Set()
  );
  private _favoriteStatusChanged: Subject<{wordId: string, isFavorite: boolean}> = new Subject();

  recentSearches$ = this._recentSearches.asObservable();
  favoriteWords$ = this._favoriteWords.asObservable();
  favoriteWordIds$ = this._favoriteWordIds.asObservable();
  favoriteStatusChanged$ = this._favoriteStatusChanged.asObservable();

  constructor(
    private _http: HttpClient, 
    private _authService: AuthService, 
    private _guestLimitsService: GuestLimitsService
  ) {
    this._loadRecentSearches();
    this._loadFavoriteWords();
  }

  // Obtenir les statistiques des contributeurs en ligne
  getOnlineContributorsStats(): Observable<{
    onlineContributors: number;
    activeUsers: number;
    timestamp: string;
  }> {
    return this._http.get<{
      onlineContributors: number;
      activeUsers: number;
      timestamp: string;
    }>(`${environment.apiUrl}/users/analytics/online-contributors`);
  }

  // Obtenir les statistiques des mots en temps réel
  getWordsStatistics(): Observable<{
    totalApprovedWords: number;
    wordsAddedToday: number;
    wordsAddedThisWeek: number;
    wordsAddedThisMonth: number;
    timestamp: string;
  }> {
    return this._http.get<{
      totalApprovedWords: number;
      wordsAddedToday: number;
      wordsAddedThisWeek: number;
      wordsAddedThisMonth: number;
      timestamp: string;
    }>(`${this._WORDS_API_URL}/analytics/statistics`);
  }

  // Fonction utilitaire pour normaliser les ID de MongoDB (_id → id)
  private _normalizeId(mongoWord: any): Word {
    if (!mongoWord) return null as any;

    // Créer une copie pour ne pas modifier l'original
    const wordWithId = { ...mongoWord, id: mongoWord._id };

    // Conserver toutes les propriétés d'origine, y compris les objets complexes
    return wordWithId as Word;
  }

  // Fonction utilitaire pour normaliser un tableau d'objets avec _id
  private _normalizeIds(items: any[]): Word[] {
    if (!items) return [];
    return items.map((item) => this._normalizeId(item));
  }

  // Recherche de mots
  searchWords(params: SearchParams): Observable<SearchResults> {
    let httpParams = new HttpParams()
      .set('query', params.query || '')
      .set('page', params.page?.toString() || '1')
      .set('limit', params.limit?.toString() || '10');

    // Solution simple : envoyer les tableaux comme des strings séparées par des virgules
    if (params.languages && params.languages.length) {
      // Joindre les langues avec des virgules
      httpParams = httpParams.set('languages', params.languages.join(','));
    }

    if (params.categories && params.categories.length) {
      // Joindre les catégories avec des virgules
      httpParams = httpParams.set('categories', params.categories.join(','));
    }

    if (params.partsOfSpeech && params.partsOfSpeech.length) {
      // Joindre les parties du discours avec des virgules
      httpParams = httpParams.set(
        'partsOfSpeech',
        params.partsOfSpeech.join(',')
      );
    }

    if (params.query && params.query.trim() !== '') {
      this._addToRecentSearches(params.query);
    }

    return this._http
      .get<any>(`${this._WORDS_API_URL}/search`, { params: httpParams })
      .pipe(
        map((results) => ({
          ...results,
          words: this._normalizeIds(results.words).map((word) =>
            this._checkIfFavorite(word)
          ),
        })),
        catchError((error) => {
          console.error('Error searching words:', error);
          return of({
            words: [],
            total: 0,
            page: params.page || 1,
            limit: params.limit || 10,
            totalPages: 0,
          });
        })
      );
  }

  // Obtenir un mot par ID
  getWordById(id: string): Observable<Word | null> {
    // Pour les visiteurs non authentifiés, juste récupérer le mot
    if (!this._authService.isAuthenticated()) {
      return this._http.get<any>(`${this._WORDS_API_URL}/${id}`).pipe(
        map((response) => (response ? this._normalizeId(response) : null)),
        catchError((error) => {
          console.error(`Error fetching word with ID ${id}:`, error);
          return of(null);
        })
      );
    }

    // Si l'utilisateur est authentifié, vérifier également l'état des favoris
    return this._http.get<any>(`${this._WORDS_API_URL}/${id}`).pipe(
      switchMap((response) => {
        if (!response) return of(null);
        const wordWithId = this._normalizeId(response);

        // Utiliser le cache local pour les favoris (plus rapide et cohérent)
        console.log(`🔥 Frontend: Vérification favoris locale pour ${wordWithId.id}`);
        return of(this._checkIfFavorite(wordWithId));
      }),
      catchError((error) => {
        console.error(`Error fetching word with ID ${id}:`, error);
        return of(null);
      })
    );
  }

  // Obtenir les mots mis en vedette/populaires
  getFeaturedWords(limit: number = 3): Observable<Word[]> {
    return this._http
      .get<any[]>(`${this._WORDS_API_URL}/featured?limit=${limit}`)
      .pipe(
        map((words) =>
          this._normalizeIds(words || []).map((word) => this._checkIfFavorite(word))
        ),
        catchError((error) => {
          console.error('Error fetching featured words:', error);
          return of([]);
        })
      );
  }

  // Obtenir les catégories disponibles
  getCategories(language?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (language) {
      params = params.set('language', language);
    }

    return this._http
      .get<any[]>(`${this._CATEGORIES_API_URL}`, { params })
      .pipe(
        map((categories) => {
          return categories.map((cat) => ({
            ...cat,
            id: cat._id,
          }));
        }),
        catchError((error) => {
          console.error('Error fetching categories:', error);
          return of([]);
        })
      );
  }

  // Ajouter un mot aux favoris
  addToFavorites(wordId: string): Observable<{ success: boolean }> {
    if (!this._authService.isAuthenticated()) {
      return of({ success: false });
    }

    console.log(`🔥 Frontend: Ajout aux favoris avec l'ID: ${wordId}`);

    // Mise à jour optimiste de l'état local
    this._setFavoriteStatus(wordId, true);

    return this._http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/favorite-words/${wordId}`,
        {}
      )
      .pipe(
        tap((response) => {
          console.log('🔥 Frontend: Réponse addToFavorites:', response);
          if (!response.success) {
            // Rollback en cas d'échec
            console.log('🔥 Frontend: Échec API, rollback de l\'état');
            this._setFavoriteStatus(wordId, false);
          }
        }),
        catchError((error) => {
          console.error(`Error adding word ${wordId} to favorites:`, error);
          // Rollback en cas d'erreur
          this._setFavoriteStatus(wordId, false);
          return of({ success: false });
        })
      );
  }

  // Supprimer un mot des favoris
  removeFromFavorites(wordId: string): Observable<{ success: boolean }> {
    if (!this._authService.isAuthenticated()) {
      return of({ success: false });
    }

    console.log(`🔥 Frontend: Suppression des favoris avec l'ID: ${wordId}`);

    // Mise à jour optimiste de l'état local
    this._setFavoriteStatus(wordId, false);

    return this._http
      .delete<{ success: boolean }>(
        `${environment.apiUrl}/favorite-words/${wordId}`
      )
      .pipe(
        tap((response) => {
          console.log(`🔥 Frontend: Réponse removeFromFavorites pour ${wordId}:`, response);
          if (!response.success) {
            // Rollback en cas d'échec
            console.log('🔥 Frontend: Échec API, rollback de l\'état');
            this._setFavoriteStatus(wordId, true);
          }
        }),
        catchError((error) => {
          console.error(`Error removing word ${wordId} from favorites:`, error);
          // Rollback en cas d'erreur
          this._setFavoriteStatus(wordId, true);
          return of({ success: false });
        })
      );
  }

  // Toggle des favoris (ajout/suppression)
  toggleFavorite(word: Word): Observable<{ success: boolean }> {
    if (!this._authService.isAuthenticated()) {
      return of({ success: false });
    }

    if (!word || !word.id) {
      return of({ success: false });
    }

    // Si le mot est déjà en favoris, le supprimer
    if (word.isFavorite) {
      return this.removeFromFavorites(word.id);
    }
    // Sinon, l'ajouter
    else {
      return this.addToFavorites(word.id);
    }
  }

  getFavoriteWords(page: number = 1, limit: number = 10): Observable<Word[]> {
    if (!this._authService.isAuthenticated()) {
      console.log('Utilisateur non authentifié');
      return of([]);
    }

    console.log(`🔥 Frontend: Appel API getFavoriteWords (page=${page}, limit=${limit})`);

    // return this._http.get<any>(`${this._WORDS_API_URL}/favorites/user?page=${page}&limit=${limit}`)
    return this._http
      .get<any>(
        `${environment.apiUrl}/favorite-words?page=${page}&limit=${limit}`
      )
      .pipe(
        tap((response) => console.log('Réponse API:', response)),
        map((response) => response.words || []),
        map((words) => this._normalizeIds(words)),
        tap((words) => {
          console.log('🔥 Frontend: Mots favoris récupérés:', words.length);
          const favoritesWithFlag = words.map((word) => ({
            ...word,
            isFavorite: true,
          }));
          
          // Mettre à jour la liste des favoris
          this._favoriteWords.next(favoritesWithFlag);
          
          // Mettre à jour le Set des IDs pour les vérifications rapides
          const favoriteIds = new Set(words.map(word => word.id));
          this._favoriteWordIds.next(favoriteIds);
          
          console.log(`🔥 Frontend: Cache favoris mis à jour - ${favoriteIds.size} IDs`);
        }),
        catchError((error) => {
          console.error('Error fetching favorite words:', error);
          return of([]);
        })
      );
  }

  // Vérifier si un mot est dans les favoris (utilise le cache local)
  checkIfFavorite(wordId: string): Observable<boolean> {
    if (!this._authService.isAuthenticated()) {
      console.log('🔥 Frontend: Utilisateur non authentifié, mot pas en favoris');
      return of(false);
    }

    // Utiliser le cache local pour une réponse immédiate
    const result = this.isFavorite(wordId);
    console.log(`🔥 Frontend: Vérification cache local pour ${wordId}:`, result);
    return of(result);
  }

  // Vérifier si un mot est dans les favoris via l'API (pour la synchronisation)
  checkIfFavoriteAPI(wordId: string): Observable<boolean> {
    if (!this._authService.isAuthenticated()) {
      return of(false);
    }

    console.log(`🔥 Frontend: Vérification API pour ${wordId}`);
    return this._http
      .get<boolean>(`${environment.apiUrl}/favorite-words/check/${wordId}`)
      .pipe(
        tap(result => {
          console.log(`🔥 Frontend: Résultat API checkIfFavorite pour ${wordId}:`, result);
          // Synchroniser avec l'état local si différent
          if (result !== this.isFavorite(wordId)) {
            console.log(`🔥 Frontend: Désynchronisation détectée, mise à jour cache`);
            this._setFavoriteStatus(wordId, result);
          }
        }),
        catchError((error) => {
          console.error(`🔥 Frontend: Erreur checkIfFavorite pour ${wordId}:`, error);
          return of(false);
        })
      );
  }

  // Partager un mot favori avec un autre utilisateur
  shareWord(
    wordId: string,
    username: string
  ): Observable<{ success: boolean; message: string }> {
    if (!this._authService.isAuthenticated()) {
      return of({
        success: false,
        message: 'Vous devez être connecté pour partager un mot',
      });
    }

    return this._http
      .post<{ success: boolean; message: string }>(
        `${environment.apiUrl}/favorite-words/share`,
        { wordId, username }
      )
      .pipe(
        catchError((error) => {
          console.error('Error sharing word:', error);
          return of({
            success: false,
            message:
              error.error?.message ||
              'Une erreur est survenue lors du partage du mot',
          });
        })
      );
  }

  // Soumettre un nouveau mot
  submitWord(wordData: Partial<Word> | FormData): Observable<Word | null> {
    if (!this._authService.isAuthenticated()) {
      return of(null);
    }

    const url =
      wordData instanceof FormData
        ? `${this._WORDS_API_URL}/with-audio`
        : `${this._WORDS_API_URL}`;

    return this._http.post<any>(url, wordData).pipe(
      map((response) => (response ? this._normalizeId(response) : null)),
      catchError((error) => {
        console.error('Error submitting new word:', error);
        return of(null);
      })
    );
  }

  // Méthodes pour la gestion des révisions
  canUserEditWord(wordId: string): Observable<EditPermissionsResponse> {
    if (!this._authService.isAuthenticated()) {
      return of({ canEdit: false, message: 'Vous devez être connecté' });
    }

    return this._http
      .get<EditPermissionsResponse>(`${this._WORDS_API_URL}/${wordId}/can-edit`)
      .pipe(
        catchError((error) => {
          console.error('Error checking edit permissions:', error);
          return of({
            canEdit: false,
            message: 'Erreur lors de la vérification des permissions',
          });
        })
      );
  }

  updateWord(
    wordId: string,
    updateData: UpdateWordDto
  ): Observable<Word | null> {
    if (!this._authService.isAuthenticated()) {
      return of(null);
    }

    // Récupérer l'utilisateur courant
    const currentUser = this._authService.getCurrentUser();
    const isAdmin =
      currentUser &&
      (currentUser.role === 'admin' || currentUser.role === 'superadmin');
    const forceRevision = !!updateData.forceRevision;

    // Liste des propriétés du schéma Mongoose
    const allowedProps = [
      'pronunciation',
      'etymology',
      'meanings',
      'translations',
      'languageVariants',
      'audioFiles',
      'status',
    ];

    let payload: any = { ...updateData };

    // Si l'utilisateur est admin/superadmin ET ne force pas la révision, on nettoie le payload
    if (isAdmin && !forceRevision) {
      payload = {};
      for (const key of allowedProps) {
        if (updateData[key as keyof UpdateWordDto] !== undefined) {
          payload[key] = updateData[key as keyof UpdateWordDto];
        }
      }
    }
    // Sinon, on laisse revisionNotes et forceRevision pour la logique métier backend

    return this._http
      .patch<any>(`${this._WORDS_API_URL}/${wordId}`, payload)
      .pipe(
        map((response) => (response ? this._normalizeId(response) : null)),
        catchError((error) => {
          console.error('Error updating word:', error);
          throw error;
        })
      );
  }

  uploadAudio(
    wordId: string,
    accent: string,
    audioFile: File
  ): Observable<Word | null> {
    if (!this._authService.isAuthenticated()) {
      return of(null);
    }

    const formData = new FormData();
    formData.append('audioFile', audioFile, audioFile.name);
    formData.append('accent', accent);

    return this._http
      .post<any>(`${this._WORDS_API_URL}/${wordId}/audio`, formData)
      .pipe(
        map((response) => (response ? this._normalizeId(response) : null)),
        catchError((error) => {
          console.error('Error uploading audio file:', error);
          throw error;
        })
      );
  }

  /**
   * Met à jour un mot avec fichier audio en une seule requête
   */
  updateWordWithAudio(
    wordId: string,
    updateData: UpdateWordDto,
    audioFile: File
  ): Observable<Word | null> {
    if (!this._authService.isAuthenticated()) {
      return of(null);
    }

    const formData = new FormData();

    // Ajouter les données textuelles
    if (updateData.pronunciation) {
      formData.append('pronunciation', updateData.pronunciation);
    }
    if (updateData.etymology) {
      formData.append('etymology', updateData.etymology);
    }
    if (updateData.meanings) {
      formData.append('meanings', JSON.stringify(updateData.meanings));
    }
    if (updateData.translations) {
      formData.append('translations', JSON.stringify(updateData.translations));
    }
    if (updateData.revisionNotes) {
      formData.append('revisionNotes', updateData.revisionNotes);
    }
    if (updateData.forceRevision !== undefined) {
      formData.append('forceRevision', updateData.forceRevision.toString());
    }

    // Ajouter le fichier audio
    formData.append('audioFile', audioFile, audioFile.name);

    return this._http
      .patch<any>(`${this._WORDS_API_URL}/${wordId}/with-audio`, formData)
      .pipe(
        map((response) => (response ? this._normalizeId(response) : null)),
        catchError((error) => {
          console.error('Error updating word with audio:', error);
          throw error;
        })
      );
  }

  getRevisionHistory(wordId: string): Observable<RevisionHistory[]> {
    if (!this._authService.isAuthenticated()) {
      return of([]);
    }

    return this._http
      .get<RevisionHistory[]>(`${this._WORDS_API_URL}/${wordId}/revisions`)
      .pipe(
        catchError((error) => {
          console.error('Error fetching revision history:', error);
          return of([]);
        })
      );
  }

  // Méthodes pour les admins
  getPendingRevisions(
    page = 1,
    limit = 10
  ): Observable<{
    revisions: RevisionHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!this._authService.isAuthenticated()) {
      return of({ revisions: [], total: 0, page, limit, totalPages: 0 });
    }

    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this._http
      .get<any>(`${this._WORDS_API_URL}/revisions/pending`, { params })
      .pipe(
        catchError((error) => {
          console.error('Error fetching pending revisions:', error);
          return of({ revisions: [], total: 0, page, limit, totalPages: 0 });
        })
      );
  }

  approveRevision(
    wordId: string,
    revisionId: string,
    notes?: string
  ): Observable<Word | null> {
    if (!this._authService.isAuthenticated()) {
      return of(null);
    }

    const payload = notes ? { notes } : {};
    return this._http
      .post<any>(
        `${this._WORDS_API_URL}/${wordId}/revisions/${revisionId}/approve`,
        payload
      )
      .pipe(
        map((response) => (response ? this._normalizeId(response) : null)),
        catchError((error) => {
          console.error('Error approving revision:', error);
          throw error;
        })
      );
  }

  rejectRevision(
    wordId: string,
    revisionId: string,
    reason: string
  ): Observable<void> {
    if (!this._authService.isAuthenticated()) {
      return of(void 0);
    }

    return this._http
      .post<void>(
        `${this._WORDS_API_URL}/${wordId}/revisions/${revisionId}/reject`,
        { reason }
      )
      .pipe(
        catchError((error) => {
          console.error('Error rejecting revision:', error);
          throw error;
        })
      );
  }

  // Méthodes privées pour gérer les recherches récentes et les favoris
  private _loadRecentSearches(): void {
    try {
      const storedSearches = localStorage.getItem('recentSearches');
      if (storedSearches) {
        this._recentSearches.next(JSON.parse(storedSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches from localStorage:', error);
    }
  }

  private _addToRecentSearches(query: string): void {
    try {
      const currentSearches = this._recentSearches.value;
      const updatedSearches = [
        query,
        ...currentSearches.filter((s) => s !== query),
      ].slice(0, 10);
      this._recentSearches.next(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error adding to recent searches:', error);
    }
  }

  private _loadFavoriteWords(): void {
    // Charger les favoris au démarrage si authentifié
    if (this._authService.isAuthenticated()) {
      this.getFavoriteWords().subscribe();
    }

    // Réagir aux changements d'authentification
    this._authService.currentUser$.subscribe((user) => {
      if (user) {
        // Utilisateur connecté - charger ses favoris
        this.getFavoriteWords().subscribe();
      } else {
        // Utilisateur déconnecté - nettoyer le cache
        this._favoriteWords.next([]);
        this._favoriteWordIds.next(new Set());
        console.log('🔥 Frontend: Cache favoris nettoyé - utilisateur déconnecté');
      }
    });
  }

  /**
   * Méthode centrale pour mettre à jour l'état des favoris
   * Gère la synchronisation entre tous les états locaux
   */
  private _setFavoriteStatus(wordId: string, isFavorite: boolean): void {
    console.log(`🔥 Frontend: _setFavoriteStatus - wordId: ${wordId}, isFavorite: ${isFavorite}`);
    
    // 1. Mettre à jour le Set des IDs favoris pour les vérifications rapides
    const currentIds = this._favoriteWordIds.value;
    const newIds = new Set(currentIds);
    
    if (isFavorite) {
      newIds.add(wordId);
    } else {
      newIds.delete(wordId);
    }
    this._favoriteWordIds.next(newIds);
    
    // 2. Mettre à jour la liste complète des favoris
    const currentFavorites = this._favoriteWords.value;
    
    if (isFavorite) {
      // Ajouter si pas déjà présent
      const existingFavorite = currentFavorites.find((w) => w.id === wordId);
      if (!existingFavorite) {
        // On a besoin du mot complet, le chercher si nécessaire
        this._addWordToFavoritesList(wordId);
      }
    } else {
      // Supprimer de la liste
      const updatedFavorites = currentFavorites.filter((w) => w.id !== wordId);
      this._favoriteWords.next(updatedFavorites);
    }
    
    // 3. Notifier tous les composants du changement
    this._favoriteStatusChanged.next({wordId, isFavorite});
    
    console.log(`🔥 Frontend: État favoris mis à jour - Total IDs: ${newIds.size}`);
  }

  /**
   * Ajouter un mot à la liste des favoris (récupère le mot complet si nécessaire)
   */
  private _addWordToFavoritesList(wordId: string): void {
    // D'abord chercher si on a le mot en cache dans une recherche récente
    // Sinon le récupérer via l'API
    this.getWordById(wordId).subscribe((word) => {
      if (word) {
        const currentFavorites = this._favoriteWords.value;
        const updatedFavorites = [...currentFavorites, { ...word, isFavorite: true }];
        this._favoriteWords.next(updatedFavorites);
      }
    });
  }

  /**
   * Méthode rapide pour vérifier si un mot est favori
   */
  isFavorite(wordId: string): boolean {
    return this._favoriteWordIds.value.has(wordId);
  }

  private _checkIfFavorite(word: Word): Word {
    return {
      ...word,
      isFavorite: this.isFavorite(word.id),
    };
  }

  /**
   * ✨ NOUVELLE MÉTHODE : Récupère les langues disponibles avec comptage des mots
   */
  getAvailableLanguages(): Observable<any[]> {
    return this._http.get<any[]>(`${this._WORDS_API_URL}/available-languages`).pipe(
      tap(languages => {
        console.log('🌍 Langues disponibles récupérées:', languages);
      }),
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des langues:', error);
        // Retourner une liste vide en cas d'erreur
        return of([]);
      })
    );
  }
}
