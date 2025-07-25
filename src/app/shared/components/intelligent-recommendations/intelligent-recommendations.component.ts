import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

// Services
import { RecommendationService } from '../../../core/services/recommendation.service';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { Router } from '@angular/router';

// Types
import {
  RecommendedWord,
  RecommendationsResponse,
  RecommendationFeedback,
  PersonalRecommendationsParams,
  RECOMMENDATION_CATEGORIES,
  RecommendationCategory,
} from '../../../core/models/recommendation';

@Component({
  selector: 'app-intelligent-recommendations',
  standalone: false,
  templateUrl: './intelligent-recommendations.component.html',
  styleUrls: ['./intelligent-recommendations.component.scss'],
})
export class IntelligentRecommendationsComponent implements OnInit, OnDestroy {
  @Input() limit: number = 5;
  @Input() type: 'personal' | 'trending' | 'linguistic' | 'semantic' | 'mixed' =
    'mixed';
  @Input() showCategoryFilter: boolean = true;
  @Input() showRefreshButton: boolean = true;
  @Input() compact: boolean = false;

  @Output() wordSelected = new EventEmitter<RecommendedWord>();
  @Output() feedbackProvided = new EventEmitter<RecommendationFeedback>();

  // État du composant
  recommendations: RecommendedWord[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  selectedCategory: string = 'mixed';

  // Catégories disponibles
  categories = RECOMMENDATION_CATEGORIES;

  // Performance metrics
  generationTime: number = 0;
  fromCache: boolean = false;
  avgScore: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private recommendationService: RecommendationService,
    private dictionaryService: DictionaryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les recommandations intelligentes
   */
  async loadRecommendations(refresh: boolean = false): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.error = null;

    console.log('🎯 Composant: Chargement des recommandations intelligentes', {
      type: this.selectedCategory,
      limit: this.limit,
      refresh,
    });

    try {
      const params: PersonalRecommendationsParams = {
        limit: this.limit,
        type: this.selectedCategory as any,
        refresh,
      };

      this.recommendationService
        .getPersonalRecommendations(params)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe({
          next: (response: RecommendationsResponse) => {
            console.log('✅ Composant: Recommandations reçues', response);

            this.recommendations = response.recommendations;
            this.generationTime = response.generationTimeMs;
            this.fromCache = response.fromCache;
            this.avgScore = response.avgScore;

            // Marquer les recommandations comme vues
            this.trackRecommendationsViewed();
          },
          error: (error) => {
            console.error('❌ Composant: Erreur lors du chargement', error);
            this.error =
              'Impossible de charger les recommandations. Utilisation de recommandations par défaut.';
            this.recommendations =
              this.recommendationService.getFallbackRecommendations();
          },
        });
    } catch (error) {
      console.error('❌ Composant: Erreur inattendue', error);
      this.isLoading = false;
      this.error = "Une erreur inattendue s'est produite.";
    }
  }

  /**
   * Changer la catégorie de recommandations
   */
  onCategoryChange(categoryId: string): void {
    if (this.selectedCategory === categoryId) return;

    console.log('🔄 Composant: Changement de catégorie', categoryId);
    this.selectedCategory = categoryId;
    this.loadRecommendations(true); // Forcer le refresh pour la nouvelle catégorie
  }

  /**
   * Rafraîchir les recommandations
   */
  refreshRecommendations(): void {
    console.log('🔄 Composant: Rafraîchissement manuel des recommandations');
    this.loadRecommendations(true);
  }

  /**
   * Naviguer vers les détails d'un mot
   */
  viewWord(recommendation: RecommendedWord): void {
    console.log('👀 Composant: Consultation du mot', recommendation.word);

    // Enregistrer le feedback de vue
    this.provideFeedback(recommendation.id, 'view');

    // Émettre l'événement pour le parent
    this.wordSelected.emit(recommendation);

    // Naviguer vers la page de détails
    this.router.navigate(['/dictionary/word', recommendation.id]);
  }

  /**
   * Ajouter/retirer des favoris
   */
  toggleFavorite(recommendation: RecommendedWord, event: Event): void {
    event.stopPropagation(); // Empêcher la navigation

    console.log('❤️ Composant: Toggle favori pour', recommendation.word);

    // Utiliser le service dictionary existant
    this.dictionaryService
      .addToFavorites(recommendation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Enregistrer le feedback
          this.provideFeedback(recommendation.id, 'favorite');

          // Mettre à jour l'état local (si nécessaire)
          // recommendation.isFavorite = true;
        },
        error: (error) => {
          console.error("❌ Erreur lors de l'ajout aux favoris:", error);
        },
      });
  }

  /**
   * Liker une recommandation
   */
  likeRecommendation(recommendation: RecommendedWord, event: Event): void {
    event.stopPropagation();
    console.log('👍 Composant: Like pour', recommendation.word);
    this.provideFeedback(recommendation.id, 'like');
  }

  /**
   * Indiquer que la recommandation n'intéresse pas
   */
  notInterested(recommendation: RecommendedWord, event: Event): void {
    event.stopPropagation();
    console.log('👎 Composant: Pas intéressé par', recommendation.word);
    this.provideFeedback(recommendation.id, 'not_interested');

    // Retirer de la liste locale
    this.recommendations = this.recommendations.filter(
      (r) => r.id !== recommendation.id
    );
  }

  /**
   * Enregistrer un feedback
   */
  private provideFeedback(
    wordId: string,
    feedbackType: RecommendationFeedback['feedbackType'],
    reason?: string
  ): void {
    const feedback: RecommendationFeedback = {
      wordId,
      feedbackType,
      reason,
    };

    this.recommendationService
      .provideFeedback(feedback)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Feedback enregistré:', response.message);
          this.feedbackProvided.emit(feedback);
        },
        error: (error) => {
          console.error(
            "❌ Erreur lors de l'enregistrement du feedback:",
            error
          );
        },
      });
  }

  /**
   * Marquer les recommandations comme vues
   */
  private trackRecommendationsViewed(): void {
    // Enregistrer une vue globale pour améliorer l'algorithme
    if (this.recommendations.length > 0) {
      // On peut tracker la vue de l'ensemble des recommandations
      // pour améliorer les futures suggestions
    }
  }

  /**
   * Obtenir la catégorie pour affichage
   */
  getCategoryInfo(categoryId: string): RecommendationCategory | undefined {
    return this.categories.find((cat) => cat.id === categoryId);
  }

  /**
   * Obtenir la couleur de score
   */
  getScoreColor(score: number): string {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    if (score >= 0.4) return 'text-orange-500';
    return 'text-red-500';
  }

  /**
   * Obtenir l'icône de confiance
   */
  getConfidenceIcon(score: number): string {
    if (score >= 0.9) return '🎯';
    if (score >= 0.7) return '⭐';
    if (score >= 0.5) return '👍';
    return '💡';
  }

  /**
   * Formater le temps de génération
   */
  getFormattedGenerationTime(): string {
    if (this.generationTime < 1000) {
      return `${this.generationTime}ms`;
    }
    return `${(this.generationTime / 1000).toFixed(1)}s`;
  }

  /**
   * Obtenir le texte du statut
   */
  getStatusText(): string {
    if (this.isLoading) return 'Génération en cours...';
    if (this.error) return 'Erreur de chargement';
    if (this.fromCache) return 'Depuis le cache';
    return `Généré en ${this.getFormattedGenerationTime()}`;
  }

  /**
   * Vérifier si les recommandations sont vides
   */
  get hasRecommendations(): boolean {
    return this.recommendations.length > 0;
  }

  /**
   * Obtenir le message d'état vide
   */
  getEmptyStateMessage(): string {
    if (this.isLoading) return 'Chargement des recommandations...';
    if (this.error) return this.error;
    return 'Aucune recommandation disponible pour le moment.';
  }

  /**
   * Trackby function pour les recommandations
   */
  trackByRecommendation(index: number, item: RecommendedWord): string {
    return item.id;
  }

  /**
   * Trackby function pour les catégories
   */
  trackByCategory(index: number, item: RecommendationCategory): string {
    return item.id;
  }
}
