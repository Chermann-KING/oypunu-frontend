import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GuestLimitsService } from '../../../../core/services/guest-limits.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Word } from '../../../../core/models/word';

@Component({
  selector: 'app-word-details',
  templateUrl: './word-details.component.html',
  styleUrls: ['./word-details.component.scss'],
  standalone: false,
  providers: [DictionaryService, AuthService],
})
export class WordDetailsComponent implements OnInit, OnDestroy {
  word: Word | null = null;
  isLoading = true;
  error = '';
  isAuthenticated = false;
  activeTab: 'definitions' | 'examples' | 'related' | 'translations' =
    'definitions';
  canEdit = false;
  currentUser: any = null;
  
  // Gestion des limitations pour visiteurs
  showSignupModal = false;
  limitReached = false;
  guestLimits: any = null;

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

  private _destroy$ = new Subject<void>();

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _dictionaryService: DictionaryService,
    private _authService: AuthService,
    private _guestLimitsService: GuestLimitsService,
    private _toastService: ToastService
  ) {}

  ngOnInit(): void {
    // S'assurer que l'onglet par défaut est toujours 'definitions'
    this.activeTab = 'definitions';

    // Vérifier si l'utilisateur est authentifié
    this._authService.currentUser$
      .pipe(takeUntil(this._destroy$))
      .subscribe((user) => {
        this.isAuthenticated = !!user;
      });

    // Obtenir l'ID du mot depuis l'URL
    this._route.paramMap.pipe(takeUntil(this._destroy$)).subscribe((params) => {
      const wordId = params.get('id');
      if (wordId) {
        // Réinitialiser l'onglet à 'definitions' pour chaque nouveau mot
        this.activeTab = 'definitions';
        this.loadWord(wordId);
      } else {
        this.error = 'Identifiant de mot manquant';
        this.isLoading = false;
      }
    });

    this.currentUser = this._authService.getCurrentUser();

    // Écouter les changements de statut des favoris pour synchroniser l'affichage
    this._dictionaryService.favoriteStatusChanged$
      .pipe(takeUntil(this._destroy$))
      .subscribe(({wordId, isFavorite}) => {
        if (this.word && this.word.id === wordId) {
          console.log(`🔥 WordDetails: Synchronisation statut favori ${wordId}: ${isFavorite}`);
          this.word.isFavorite = isFavorite;
        }
      });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  loadWord(wordId: string): void {
    this.isLoading = true;
    
    // Vérifier les limitations pour les visiteurs non authentifiés
    if (!this.isAuthenticated) {
      const limitResult = this._guestLimitsService.canViewWord();
      if (!limitResult.allowed) {
        this.limitReached = true;
        this.showSignupModal = true;
        this.guestLimits = this._guestLimitsService.getCurrentLimits();
        this.error = limitResult.message || 'Limite de consultation atteinte';
        this.isLoading = false;
        return;
      }
    }

    this._dictionaryService
      .getWordById(wordId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (word) => {
          if (word) {
            this.word = word;
            this._checkEditPermissions();
            // Enregistrer la consultation pour les visiteurs
            if (!this.isAuthenticated) {
              this._guestLimitsService.recordWordView();
              
              // Donner du feedback discret sur les consultations restantes
              const stats = this._guestLimitsService.getCurrentStats();
              if (stats.wordsRemaining === 1) {
                this._toastService.warning(
                  'Dernière consultation gratuite',
                  'Inscrivez-vous pour un accès illimité aux mots et traductions !',
                  4000
                );
              } else if (stats.wordsRemaining === 0) {
                this._toastService.info(
                  'Découverte terminée',
                  'Créez votre compte gratuit pour continuer à explorer le dictionnaire !',
                  5000
                );
              }
            }
          } else if (!this.isAuthenticated) {
            // Pour les visiteurs, si le mot n'est pas trouvé, cela peut être dû aux limitations
            this.limitReached = true;
            this.showSignupModal = true;
            this.guestLimits = this._guestLimitsService.getCurrentLimits();
            this.error = 'Limite de consultation atteinte. Inscrivez-vous pour accéder à plus de mots.';
          } else {
            this.error = 'Mot non trouvé';
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement du mot', err);
          this.error = 'Une erreur est survenue lors du chargement du mot';
          this.isLoading = false;
        },
      });
  }

  toggleFavorite(): void {
    console.log('bouton favoris cliqué. Id du mot: ' + this.word?.id);

    if (!this.word) return;

    if (!this.isAuthenticated) {
      // Afficher la modal d'inscription pour les visiteurs avec un message informatif
      this._toastService.info(
        'Fonctionnalité réservée aux membres',
        'Inscrivez-vous gratuitement pour ajouter des mots à vos favoris et accéder à toutes les fonctionnalités !',
        4000
      );
      this.showSignupModal = true;
      this.guestLimits = this._guestLimitsService.getCurrentLimits();
      return;
    }
    console.log('avant la condition de mise en favoris');

    // Utiliser toggleFavorite qui gère automatiquement l'état avec mise à jour optimiste
    console.log(`🔥 WordDetails: Toggle favori pour ${this.word.id} (état actuel: ${this.word.isFavorite})`);
    
    this._dictionaryService
      .toggleFavorite(this.word)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response) => {
          console.log(`🔥 WordDetails: Réponse toggleFavorite:`, response);
          if (response.success) {
            console.log(`🔥 WordDetails: Toggle confirmé par API`);
          } else {
            console.log(`🔥 WordDetails: Toggle échoué, état restauré automatiquement`);
          }
        },
        error: (error) => {
          console.error(`🔥 WordDetails: Erreur toggle (état restauré):`, error);
        }
      });
  }

  switchTab(
    tab: 'definitions' | 'examples' | 'related' | 'translations'
  ): void {
    this.activeTab = tab;
  }

  playAudio(audioUrl: string): void {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.play().catch((err) => {
      console.error('Erreur lors de la lecture audio', err);
    });
  }

  getLanguageName(code: string): string {
    return this.languages[code as keyof typeof this.languages] || code;
  }

  getPartOfSpeechName(code: string): string {
    return this.partsOfSpeech[code as keyof typeof this.partsOfSpeech] || code;
  }

  hasSynonyms(): boolean {
    return (
      this.word?.meanings?.some((m) => m.synonyms && m.synonyms.length > 0) ??
      false
    );
  }

  hasAntonyms(): boolean {
    return (
      this.word?.meanings?.some((m) => m.antonyms && m.antonyms.length > 0) ??
      false
    );
  }

  /**
   * Récupère la première URL audio disponible
   */
  getFirstAudioUrl(): string | null {
    if (!this.word?.audioFiles) return null;

    const audioEntries = Object.entries(this.word.audioFiles);
    if (audioEntries.length === 0) return null;

    // Prendre la première entrée audio disponible
    const [accent, audioData] = audioEntries[0];
    return audioData?.url || null;
  }

  /**
   * Vérifie s'il y a des fichiers audio disponibles
   */
  hasAudioFiles(): boolean {
    if (!this.word?.audioFiles) return false;
    return Object.keys(this.word.audioFiles).length > 0;
  }

  /**
   * Récupère tous les accents audio disponibles
   */
  getAudioAccents(): Array<{ accent: string; url: string }> {
    if (!this.word?.audioFiles) return [];

    return Object.entries(this.word.audioFiles).map(([accent, audioData]) => ({
      accent,
      url: audioData.url,
    }));
  }

  getCreatedBy(createdBy: any): string {
    if (!createdBy) return 'anonyme';
    return typeof createdBy === 'object' ? createdBy.username : createdBy;
  }

  private _checkEditPermissions(): void {
    this.canEdit = false;
    if (this.word && this.isAuthenticated) {
      this._dictionaryService
        .canUserEditWord(this.word.id)
        .pipe(takeUntil(this._destroy$))
        .subscribe({
          next: (response) => {
            this.canEdit = response.canEdit;
          },
          error: (error) => {
            console.error('Error checking edit permissions:', error);
            this.canEdit = false;
          }
        });
    }
  }

  onEditWord(): void {
    if (this.word && this.canEdit) {
      this._router.navigate(['/dictionary/edit', this.word.id]);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending_revision':
        return 'bg-blue-100 text-blue-800';
      case 'revision_approved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      case 'pending_revision':
        return 'En révision';
      case 'revision_approved':
        return 'Révision approuvée';
      default:
        return status;
    }
  }

  /**
   * Fermer la modal d'inscription
   */
  closeSignupModal(): void {
    this.showSignupModal = false;
  }

  /**
   * Naviguer vers la page d'inscription
   */
  goToSignup(): void {
    this._router.navigate(['/auth/register']);
  }

  /**
   * Naviguer vers la page de connexion
   */
  goToLogin(): void {
    this._router.navigate(['/auth/login']);
  }

  /**
   * Navigate vers la page de détail d'un synonyme/antonyme
   */
  navigateToWord(wordText: string): void {
    if (!wordText || !this.word) return;
    
    console.log(`🔍 Navigation vers: "${wordText}"`);
    
    // Rechercher le mot dans la même langue que le mot actuel
    const currentLanguage = this.word.language;
    
    this._dictionaryService.searchWords({
      query: wordText,
      languages: [currentLanguage],
      limit: 5,
      page: 1
    }).pipe(takeUntil(this._destroy$))
    .subscribe({
      next: (results) => {
        if (results.words && results.words.length > 0) {
          // Chercher une correspondance exacte
          const exactMatch = results.words.find(word => 
            word.word.toLowerCase() === wordText.toLowerCase()
          );
          
          if (exactMatch) {
            console.log(`✅ Correspondance exacte trouvée: ${exactMatch.id}`);
            this._router.navigate(['/dictionary/word', exactMatch.id]);
          } else {
            // Prendre le premier résultat si pas de correspondance exacte
            const foundWord = results.words[0];
            console.log(`✅ Mot similaire trouvé: ${foundWord.id}`);
            this._router.navigate(['/dictionary/word', foundWord.id]);
          }
        } else {
          // Mot non trouvé, faire une recherche générale
          console.log(`⚠️ Mot "${wordText}" non trouvé, redirection vers la recherche`);
          this._router.navigate(['/dictionary'], { 
            queryParams: { 
              q: wordText,
              language: currentLanguage 
            } 
          });
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la recherche du mot:', error);
        // En cas d'erreur, rediriger vers la recherche
        this._router.navigate(['/dictionary'], { 
          queryParams: { 
            q: wordText,
            language: currentLanguage 
          } 
        });
      }
    });
  }
}
