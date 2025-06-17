import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { AuthService } from '../../../../core/services/auth.service';
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
  activeTab: 'definitions' | 'examples' | 'related' = 'definitions';

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
    private _authService: AuthService
  ) {}

  ngOnInit(): void {
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
        this.loadWord(wordId);
      } else {
        this.error = 'Identifiant de mot manquant';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  loadWord(wordId: string): void {
    this.isLoading = true;
    this._dictionaryService
      .getWordById(wordId)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (word) => {
          if (word) {
            this.word = word;
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
      // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
      this._router.navigate(['/auth/login']);
      return;
    }
    console.log('avant la condition de mise en favoris');

    if (this.word.isFavorite) {
      console.log('dans la condition de suppréssion');

      this._dictionaryService
        .removeFromFavorites(this.word.id)
        .pipe(takeUntil(this._destroy$))
        .subscribe((response) => {
          if (response.success) {
            if (this.word) {
              this.word.isFavorite = false;
            }
          }
        });
    } else {
      console.log("dans la condition d'ajout");

      this._dictionaryService
        .addToFavorites(this.word.id)
        .pipe(takeUntil(this._destroy$))
        .subscribe((response) => {
          if (response.success) {
            if (this.word) {
              this.word.isFavorite = true;
            }
          }
        });
    }
  }

  switchTab(tab: 'definitions' | 'examples' | 'related'): void {
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

  getCreatedBy(createdBy: any): string {
    if (!createdBy) return 'anonyme';
    return typeof createdBy === 'object' ? createdBy.username : createdBy;
  }
}
