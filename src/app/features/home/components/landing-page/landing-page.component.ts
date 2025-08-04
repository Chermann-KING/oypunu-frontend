import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { HomeDataService } from '../../services/home-data.service';
import { ActivityService, Activity } from '../../../../core/services/activity.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ApiHealthService } from '../../../../shared/services/api-health.service';

interface LiveDemoResult {
  word: string;
  language: string;
  translationCount: number;
  languages: string[];
}

// Interface supprimée - utilisation de l'interface Activity du service

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss'],
  standalone: false
})
export class LandingPageComponent implements OnInit, OnDestroy {
  // Demo de recherche
  demoQuery = '';
  demoResults: LiveDemoResult[] = [];
  isSearchingDemo = false;
  showDemoResults = false;

  // Statistiques en temps réel
  statistics = {
    wordsAdded: 0, // Sera mis à jour avec les vraies données
    onlineUsers: 0, // Sera mis à jour avec les vraies données
    totalLanguages: 0, // Sera mis à jour avec les vraies données
    todayContributions: 0 // Sera mis à jour avec les vraies données
  };

  // Activités en temps réel
  realTimeActivities: Activity[] = [];

  // Mots suggérés pour la démo
  demoSuggestions = ['bonjour', 'hello', 'saudade', 'hygge', 'ubuntu'];
  currentSuggestionIndex = 0;

  // Animations
  showHero = false;
  showStats = false;
  showFeatures = false;

  // Modals
  showSignupModal = false;
  showExploreModal = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private dictionaryService: DictionaryService,
    private homeDataService: HomeDataService,
    private activityService: ActivityService,
    private toastService: ToastService,
    private apiHealthService: ApiHealthService
  ) {}

  ngOnInit(): void {
    this.initAnimations();
    this.checkApiHealth();
    this.loadRealTimeStats();
    this.initRealTimeActivities();
    this.startRealTimeUpdates();
    this.rotateDemoSuggestions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Déconnecter le WebSocket des activités
    this.activityService.disconnect();
  }

  // Animations d'entrée
  private initAnimations(): void {
    setTimeout(() => this.showHero = true, 100);
    setTimeout(() => this.showStats = true, 300);
    setTimeout(() => this.showFeatures = true, 500);
  }

  // Vérifier la santé de l'API au chargement
  private checkApiHealth(): void {
    this.apiHealthService.getDiagnosticReport().subscribe(report => {
      if (!report.api.isOnline) {
        this.toastService.warning(
          'Problème de connexion', 
          `${report.api.error} - Utilisation des données de démonstration`
        );
      } else if (!report.activities) {
        this.toastService.info(
          'API connectée', 
          'Serveur accessible mais les activités pourraient être limitées'
        );
      }
    });
  }

  // Rotation des suggestions de démo
  private rotateDemoSuggestions(): void {
    interval(3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentSuggestionIndex = 
          (this.currentSuggestionIndex + 1) % this.demoSuggestions.length;
      });
  }

  // Initialiser les activités en temps réel
  private initRealTimeActivities(): void {
    // S'abonner aux activités en temps réel
    this.activityService.activities$
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => {
        this.realTimeActivities = activities.slice(0, 5); // Garder les 5 plus récentes
      });

    // Demander les activités récentes au chargement
    this.activityService.requestRecentActivities(5, true); // Priorité aux langues africaines

    // Essayer immédiatement l'API REST en parallèle (pour avoir des données rapidement)
    this.loadActivitiesFromAPI();

    // Fallback WebSocket après un délai plus court
    setTimeout(() => {
      if (!this.activityService.isConnected() && this.realTimeActivities.length === 0) {
        this.activityService.requestRecentActivities(5, true);
      }
    }, 1000);
  }

  // Charger les activités via API REST
  private loadActivitiesFromAPI(): void {
    this.activityService.getRecentActivities(5, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.activities && response.activities.length > 0) {
            this.realTimeActivities = response.activities;
          } else {
            // Pas d'activités dans la base, mais l'API fonctionne
            this.toastService.info('Aucune activité', 'Aucune activité récente trouvée dans la base de données');
            this.loadFallbackActivities(); // Utiliser les données démo pour l'affichage
          }
        },
        error: (error) => {
          // Erreur API - vérifier le type d'erreur
          if (error.status === 0) {
            this.toastService.warning('Connexion impossible', 'Impossible de se connecter au serveur O\'Ypunu');
          } else if (error.status >= 500) {
            this.toastService.error('Erreur serveur', 'Le serveur O\'Ypunu rencontre des difficultés');
          } else {
            this.toastService.warning('Données indisponibles', 'Les activités récentes ne peuvent pas être chargées');
          }
          
          // Utiliser des activités de démonstration comme fallback ultime
          this.loadFallbackActivities();
        }
      });
  }

  // Activités de démonstration comme fallback ultime (uniquement si aucune donnée réelle disponible)
  private loadFallbackActivities(): void {
    this.toastService.info('Mode démonstration', 'Affichage d\'exemples d\'activités en attendant les vraies données');
    this.realTimeActivities = [
      {
        id: 'demo-1',
        userId: 'demo',
        username: 'Aminata',
        activityType: 'word_created',
        entityType: 'word',
        entityId: 'demo-word-1',
        metadata: {
          wordName: 'ubuntu',
          languageCode: 'zu',
          languageName: 'isiZulu'
        },
        createdAt: new Date().toISOString(),
        timeAgo: 'à l\'instant',
        message: 'a ajouté "ubuntu"',
        flag: '🇿🇦',
        isPublic: true
      },
      {
        id: 'demo-2',
        userId: 'demo',
        username: 'Kwame',
        activityType: 'translation_added',
        entityType: 'translation',
        entityId: 'demo-translation-1',
        metadata: {
          wordName: 'sankofa',
          translatedWord: 'wisdom',
          languageCode: 'tw',
          targetLanguageCode: 'en'
        },
        createdAt: new Date(Date.now() - 60000).toISOString(),
        timeAgo: 'il y a 1 min',
        message: 'a traduit "sankofa" vers l\'anglais',
        flag: '🇬🇭',
        isPublic: true
      }
    ] as Activity[];
  }

  // Charger les statistiques réelles
  private loadRealTimeStats(): void {
    // Charger les statistiques des contributeurs en ligne
    this.dictionaryService.getOnlineContributorsStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics.onlineUsers = stats.onlineContributors;
        },
        error: (error) => {
          this.statistics.onlineUsers = Math.floor(Math.random() * 20) + 10;
          this.toastService.warning('Données partielles', 'Certaines statistiques ne sont pas disponibles');
        }
      });

    // Charger les statistiques des mots
    this.dictionaryService.getWordsStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics.wordsAdded = stats.totalApprovedWords;
          this.statistics.todayContributions = stats.wordsAddedToday;
        },
        error: (error) => {
          // Valeurs par défaut si l'API échoue
          this.statistics.wordsAdded = Math.floor(Math.random() * 1000) + 500;
          this.statistics.todayContributions = Math.floor(Math.random() * 50) + 20;
          this.toastService.error('Erreur de chargement', 'Impossible de charger les statistiques des mots');
        }
      });

    // Charger les statistiques générales (langues actives)
    this.homeDataService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics.totalLanguages = stats.languages;
        },
        error: (error) => {
          // Valeur par défaut si l'API échoue
          this.statistics.totalLanguages = Math.floor(Math.random() * 50) + 30;
          this.toastService.info('Mode démo', 'Utilisation de données d\'exemple');
        }
      });
  }

  // Mises à jour temps réel
  private startRealTimeUpdates(): void {
    // Mettre à jour toutes les statistiques réelles toutes les 30 secondes
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadRealTimeStats();
      });

    // Demander de nouvelles activités toutes les 30 secondes (fallback si WebSocket ne fonctionne pas)
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.activityService.isConnected()) {
          this.activityService.requestRecentActivities(5, true);
        }
      });
  }

  // Méthodes pour gérer les activités (les vraies activités sont gérées par ActivityService)

  // Démo de recherche interactive
  onDemoSearch(): void {
    if (!this.demoQuery.trim()) return;

    this.isSearchingDemo = true;
    this.showDemoResults = false;

    // Simuler une vraie recherche
    this.dictionaryService.searchWords({
      query: this.demoQuery,
      limit: 3,
      page: 1
    }).pipe(take(1))
    .subscribe({
      next: (results) => {
        if (results.words && results.words.length > 0) {
          this.demoResults = results.words.map(word => ({
            word: word.word,
            language: word.language,
            translationCount: word.translations?.length || 0,
            languages: this.getUniqueLanguages(word.translations || [])
          }));
        } else {
          // Fallback avec données d'exemple impressionnantes
          this.demoResults = [
            {
              word: this.demoQuery,
              language: 'fr',
              translationCount: 12,
              languages: ['en', 'es', 'de', 'it', 'pt']
            }
          ];
        }
        
        this.isSearchingDemo = false;
        setTimeout(() => this.showDemoResults = true, 100);
      },
      error: () => {
        // En cas d'erreur, montrer des données impressionnantes
        this.demoResults = [
          {
            word: this.demoQuery,
            language: 'détecté automatiquement',
            translationCount: 15,
            languages: ['en', 'es', 'de', 'it', 'pt', 'ja']
          }
        ];
        this.isSearchingDemo = false;
        setTimeout(() => this.showDemoResults = true, 100);
      }
    });
  }

  // Utiliser suggestion pour la démo
  useDemoSuggestion(suggestion: string): void {
    this.demoQuery = suggestion;
    this.onDemoSearch();
  }

  // Obtenir langues uniques des traductions
  private getUniqueLanguages(translations: any[]): string[] {
    const languages = translations.map(t => t.language).filter(Boolean);
    return [...new Set(languages)];
  }

  // Formater les nombres avec animation
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  }

  // Actions CTA
  onSignupClick(): void {
    this.router.navigate(['/auth/register']);
  }

  onExploreClick(): void {
    this.router.navigate(['/dictionary']);
  }

  onLoginClick(): void {
    this.router.navigate(['/auth/login']);
  }

  // Naviguer vers les fonctionnalités
  exploreFeature(feature: string): void {
    switch (feature) {
      case 'search':
        this.router.navigate(['/dictionary']);
        break;
      case 'community':
        this.router.navigate(['/communities']);
        break;
      case 'contribute':
        this.router.navigate(['/dictionary/add']);
        break;
      default:
        this.router.navigate(['/dictionary']);
    }
  }

  // Obtenir le placeholder animé pour la démo
  get currentDemoPlaceholder(): string {
    const suggestion = this.demoSuggestions[this.currentSuggestionIndex];
    return `Tapez "${suggestion}" pour voir la magie...`;
  }

  // Track function pour les ngFor
  trackActivity(index: number, activity: Activity): string {
    return activity.id;
  }
}