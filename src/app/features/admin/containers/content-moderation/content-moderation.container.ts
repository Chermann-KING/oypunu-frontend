/**
 * @fileoverview Container pour la modération de contenu
 *
 * Container intelligent qui gère l'affichage et les actions de modération.
 * Intègre les 6 routes backend de modération de contenu.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import {
  takeUntil,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
} from 'rxjs/operators';

import { AdminApiService } from '../../services/admin-api.service';
import { PermissionService } from '../../services/permission.service';
import {
  PendingWord,
  ModerationStatus,
  PendingWordFilters,
  ModerableContentType,
  ModerableContent,
  ReportSeverity,
} from '../../models/admin.models';

// Imports pour les nouveaux composants
import {
  ModerationCategoryStats,
  CategoryNavigationEvent,
} from '../../components/moderation-categories/moderation-categories.component';
import { ContentModerationAction } from '../../components/content-detail-modal/content-detail-modal.component';
import { Permission } from '../../models/permissions.models';
// import { ModerationAction, BulkModerationAction } from '../../components/moderation-panel/moderation-panel.component';

/**
 * Interface pour l'état de la modération étendue
 */
interface ExtendedModerationState {
  readonly isLoading: boolean;
  readonly error: string | null;
  // Données légacies
  readonly pendingWords: PendingWord[];
  readonly totalWords: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly filters: PendingWordFilters;
  readonly selectedWords: string[];
  // Nouvelles données étendues
  readonly currentView: 'categories' | 'content_list' | 'detail';
  readonly selectedCategory: ModerableContentType | null;
  readonly categoryStats: ModerationCategoryStats[];
  readonly allModerationContent: ModerableContent[];
  readonly selectedContent: ModerableContent | null;
  readonly contentFilters: {
    readonly contentType?: ModerableContentType;
    readonly severity?: ReportSeverity;
    readonly search?: string;
  };
}

/**
 * Container ContentModeration - Single Responsibility Principle
 */
@Component({
  selector: 'app-content-moderation-container',
  standalone: false,
  templateUrl: './content-moderation.container.html',
  styleUrls: ['./content-moderation.container.scss'],
})
export class ContentModerationContainer implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // État de la modération étendue
  public readonly moderationState$: Observable<ExtendedModerationState>;

  private readonly moderationStateSubject =
    new BehaviorSubject<ExtendedModerationState>({
      isLoading: true,
      error: null,
      // Données légacies
      pendingWords: [],
      totalWords: 0,
      currentPage: 1,
      pageSize: 10,
      filters: {},
      selectedWords: [],
      // Nouvelles données étendues
      currentView: 'categories',
      selectedCategory: null,
      categoryStats: [],
      allModerationContent: [],
      selectedContent: null,
      contentFilters: {},
    });

  // Contrôles de recherche et filtres
  public searchTerm = '';
  private readonly searchSubject = new Subject<string>();

  constructor(
    private readonly adminApiService: AdminApiService,
    private readonly permissionService: PermissionService,
    private readonly route: ActivatedRoute
  ) {
    this.moderationState$ = this.moderationStateSubject.asObservable();

    // Debug : surveiller tous les changements d'état
    this.moderationState$.subscribe((state) => {
      console.log('🔄 État changé:', {
        currentView: state.currentView,
        selectedCategory: state.selectedCategory,
        isLoading: state.isLoading,
        error: state.error,
        contentCount: state.allModerationContent.length,
      });
    });

    // Configuration de la recherche avec debounce
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.updateFilters({ search: searchTerm || undefined });
      });
  }

  ngOnInit(): void {
    // Charger les statistiques des catégories au lieu des mots directement
    this.loadCategoryStats();

    // Gérer les paramètres URL pour l'ouverture directe de demandes de contributeur
    // Format URL attendu: /admin/moderation?type=contributor_request&id=68a7427892bdc1be97f15542
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['type'] === 'contributor_request') {
        console.log('🔗 Ouverture directe de demande de contributeur depuis URL:', params);
        
        // Sélectionner automatiquement la catégorie des demandes de contributeur
        this.onCategorySelected({
          contentType: ModerableContentType.CONTRIBUTOR_REQUEST,
          filters: undefined
        });

        // Si un ID spécifique est fourni, l'ouvrir dans le modal après un délai
        if (params['id']) {
          setTimeout(() => {
            this.openContributorRequestById(params['id']);
          }, 1000); // Attendre que la liste soit chargée
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.moderationStateSubject.complete();
  }

  /**
   * Charge la liste des mots en attente
   */
  private loadPendingWords(): void {
    const currentState = this.moderationStateSubject.value;

    this.moderationStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    this.adminApiService
      .getPendingWords(
        currentState.currentPage,
        currentState.pageSize,
        currentState.filters
      )
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.moderationStateSubject.next({
            ...currentState,
            isLoading: false,
            error: 'Erreur lors du chargement des mots en attente',
          });
          throw error;
        })
      )
      .subscribe((response) => {
        this.moderationStateSubject.next({
          ...currentState,
          isLoading: false,
          error: null,
          pendingWords: response.data,
          totalWords: response.total,
          selectedWords: [],
        });
      });
  }

  /**
   * Charge les statistiques des catégories de modération depuis l'API backend
   */
  private loadCategoryStats(): void {
    const currentState = this.moderationStateSubject.value;

    this.moderationStateSubject.next({
      ...currentState,
      isLoading: true,
      error: null,
    });

    console.log(
      '📊 Chargement des statistiques de modération par catégorie...'
    );

    // Récupérer les statistiques spécifiques pour chaque type de contenu
    // En utilisant les endpoints dédiés pour chaque type
    const statsPromises = [
      // Mots en attente
      this.adminApiService
        .getPendingWords(1, 1, {})
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      // Langues en attente
      this.adminApiService
        .getPendingLanguages()
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      // Catégories en attente
      this.adminApiService
        .getPendingCategories()
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      // Autres types de contenu signalé (pour les types restants)
      this.adminApiService
        .getAllPendingModerationContent(
          1,
          1,
          ModerableContentType.COMMUNITY_POST
        )
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      this.adminApiService
        .getAllPendingModerationContent(
          1,
          1,
          ModerableContentType.PRIVATE_MESSAGE
        )
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      this.adminApiService
        .getAllPendingModerationContent(1, 1, ModerableContentType.USER_PROFILE)
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      this.adminApiService
        .getAllPendingModerationContent(1, 1, ModerableContentType.COMMENT)
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      this.adminApiService
        .getAllPendingModerationContent(
          1,
          1,
          ModerableContentType.MEDIA_CONTENT
        )
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      this.adminApiService
        .getAllPendingModerationContent(1, 1, ModerableContentType.REPORT)
        .pipe(catchError(() => of({ data: [], total: 0 }))),
      // Demandes de contributeur - utiliser les paramètres par défaut
      this.adminApiService
        .getPendingContributorRequests(undefined, undefined, { status: 'pending' })
        .pipe(
          map(response => {
            console.log('🤝 Debug - Réponse API des demandes de contributeur:', response);
            return response;
          }),
          catchError((error) => {
            console.error('❌ Debug - Erreur API des demandes de contributeur:', error);
            return of({ data: [], total: 0 });
          })
        ),
    ];

    Promise.all(statsPromises.map((obs) => obs.toPromise()))
      .then((results) => {
        const [
          words,
          languages,
          categories,
          communityPosts,
          privateMessages,
          userProfiles,
          comments,
          mediaContent,
          reports,
          contributorRequests,
        ] = results as any[];

        console.log('📊 Résultats des statistiques de modération:', {
          words: words?.total || 0,
          languages: languages?.total || 0,
          categories: categories?.total || 0,
          communityPosts: communityPosts?.total || 0,
          privateMessages: privateMessages?.total || 0,
          userProfiles: userProfiles?.total || 0,
          comments: comments?.total || 0,
          mediaContent: mediaContent?.total || 0,
          reports: reports?.total || 0,
          contributorRequests: contributorRequests?.total || 0,
        });

        // Transformer les données en format ModerationCategoryStats[]
        const categoryStats: ModerationCategoryStats[] = [
          {
            contentType: ModerableContentType.WORD,
            label: 'Mots',
            icon: '📝',
            color: 'bg-blue-500',
            totalCount: words?.total || 0,
            pendingCount: words?.total || 0,
            priorityCount: 0, // À calculer selon la logique métier
            averageWaitTime: 0, // À calculer selon la logique métier
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.LANGUAGE,
            label: 'Langues',
            icon: '🌍',
            color: 'bg-indigo-500',
            totalCount: languages?.total || 0,
            pendingCount: languages?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.CATEGORY,
            label: 'Catégories',
            icon: '📂',
            color: 'bg-orange-500',
            totalCount: categories?.total || 0,
            pendingCount: categories?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.COMMUNITY_POST,
            label: 'Posts Communauté',
            icon: '💬',
            color: 'bg-green-500',
            totalCount: communityPosts?.total || 0,
            pendingCount: communityPosts?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.PRIVATE_MESSAGE,
            label: 'Messages Privés',
            icon: '📩',
            color: 'bg-purple-500',
            totalCount: privateMessages?.total || 0,
            pendingCount: privateMessages?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.USER_PROFILE,
            label: 'Profils Utilisateurs',
            icon: '👤',
            color: 'bg-orange-500',
            totalCount: userProfiles?.total || 0,
            pendingCount: userProfiles?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.COMMENT,
            label: 'Commentaires',
            icon: '💭',
            color: 'bg-yellow-500',
            totalCount: comments?.total || 0,
            pendingCount: comments?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.MEDIA_CONTENT,
            label: 'Contenu Multimédia',
            icon: '🎵',
            color: 'bg-pink-500',
            totalCount: mediaContent?.total || 0,
            pendingCount: mediaContent?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.REPORT,
            label: 'IA Auto-détectée',
            icon: '🤖',
            color: 'bg-red-500',
            totalCount: reports?.total || 0,
            pendingCount: reports?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
          {
            contentType: ModerableContentType.CONTRIBUTOR_REQUEST,
            label: 'Demandes de Contributeur',
            icon: '🤝',
            color: 'bg-emerald-500',
            totalCount: contributorRequests?.total || 0,
            pendingCount: contributorRequests?.total || 0,
            priorityCount: 0,
            averageWaitTime: 0,
            lastUpdate: new Date(),
          },
        ];

        console.log(
          '✅ Statistiques des catégories de modération calculées:',
          categoryStats.map((cat) => ({
            type: cat.contentType,
            label: cat.label,
            pending: cat.pendingCount,
          }))
        );

        // Mettre à jour l'état
        this.moderationStateSubject.next({
          ...currentState,
          isLoading: false,
          error: null,
          categoryStats: categoryStats,
        });
      })
      .catch((error) => {
        console.error(
          '❌ Erreur lors du chargement des statistiques de modération:',
          error
        );
        this.moderationStateSubject.next({
          ...currentState,
          isLoading: false,
          error: 'Impossible de charger les statistiques de modération',
        });
      });
  }

  /**
   * Transforme les statistiques backend en format des catégories frontend
   */
  private transformBackendStatsToCategories(
    stats: any
  ): ModerationCategoryStats[] {
    const defaultCategories = [
      {
        contentType: ModerableContentType.WORD,
        label: 'Mots',
        icon: '📝',
        color: 'bg-blue-500',
      },
      {
        contentType: ModerableContentType.COMMENT,
        label: 'Commentaires',
        icon: '💭',
        color: 'bg-yellow-500',
      },
      {
        contentType: ModerableContentType.USER_PROFILE,
        label: 'Profils Utilisateurs',
        icon: '👤',
        color: 'bg-orange-500',
      },
      {
        contentType: ModerableContentType.LANGUAGE,
        label: 'Langues',
        icon: '🌍',
        color: 'bg-green-500',
      },
    ];

    return defaultCategories.map((category) => {
      // Chercher les stats correspondantes dans la réponse backend
      const typeStats = stats.reportsByType?.find(
        (r: any) =>
          this.mapBackendTypeToFrontend(r.type) === category.contentType
      );

      // Pour les langues, nous allons récupérer les statistiques séparément
      if (category.contentType === ModerableContentType.LANGUAGE) {
        return {
          ...category,
          totalCount: 0, // Sera mis à jour par loadLanguageStats()
          pendingCount: 0,
          priorityCount: 0,
          averageWaitTime: 24, // 24h en moyenne pour les langues
          lastUpdate: new Date(),
        };
      }

      return {
        ...category,
        totalCount: typeStats?.count || 0,
        pendingCount: Math.floor((typeStats?.count || 0) * 0.3), // Estimation
        priorityCount: Math.floor((typeStats?.count || 0) * 0.1), // Estimation
        averageWaitTime: stats.overview?.averageResolutionTime || 120,
        lastUpdate: new Date(),
      };
    });
  }

  /**
   * Charge les statistiques des langues séparément
   */
  private loadLanguageStats(currentStats: ModerationCategoryStats[]): void {
    console.log('🌍 Container - Chargement des statistiques des langues...');

    this.adminApiService
      .getPendingLanguages()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.warn(
            '❌ Container - Impossible de charger les statistiques des langues:',
            error
          );
          return [];
        })
      )
      .subscribe((response) => {
        const languageStats = response.data || [];
        const pendingCount = languageStats.length;

        console.log(
          `🌍 Container - Trouvé ${pendingCount} langues en attente:`,
          languageStats
        );

        // Debug : afficher les détails de la première langue
        if (languageStats.length > 0) {
          console.log(
            '🔍 Debug - Première langue détails:',
            JSON.stringify(languageStats[0], null, 2)
          );
        }

        // Mettre à jour les statistiques des langues
        const updatedStats = currentStats.map((category) => {
          if (category.contentType === ModerableContentType.LANGUAGE) {
            return {
              ...category,
              totalCount: pendingCount,
              pendingCount: pendingCount,
              priorityCount: Math.floor(pendingCount * 0.1), // 10% en priorité
            };
          }
          return category;
        });

        console.log('🌍 Container - Statistiques mises à jour:', updatedStats);

        // Mettre à jour l'état avec les nouvelles statistiques
        const currentState = this.moderationStateSubject.value;
        this.moderationStateSubject.next({
          ...currentState,
          categoryStats: updatedStats,
        });
      });
  }

  /**
   * Convertit les types backend vers les types frontend
   */
  private mapBackendTypeToFrontend(backendType: string): ModerableContentType {
    switch (backendType) {
      case 'word':
        return ModerableContentType.WORD;
      case 'comment':
        return ModerableContentType.COMMENT;
      case 'user':
        return ModerableContentType.USER_PROFILE;
      case 'language':
        return ModerableContentType.LANGUAGE;
      default:
        return ModerableContentType.WORD;
    }
  }

  /**
   * Met à jour les filtres et recharge les données
   */
  private updateFilters(newFilters: Partial<PendingWordFilters>): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      filters: { ...currentState.filters, ...newFilters },
      currentPage: 1,
      selectedWords: [],
    });
    this.loadPendingWords();
  }

  /**
   * Charge le contenu d'une catégorie spécifique depuis l'API backend
   */
  private loadCategoryContent(contentType: ModerableContentType): void {
    const currentState = this.moderationStateSubject.value;

    console.log('🔄 LoadCategoryContent - Début du chargement:', {
      contentType,
      currentView: currentState.currentView,
      selectedCategory: currentState.selectedCategory,
    });

    const newState = {
      ...currentState,
      isLoading: true,
      error: null,
      selectedCategory: contentType,
      currentView: 'content_list' as const,
    };

    console.log("🔄 LoadCategoryContent - Changement d'état vers:", {
      currentView: newState.currentView,
      selectedCategory: newState.selectedCategory,
      isLoading: newState.isLoading,
    });

    this.moderationStateSubject.next(newState);

    // Pour les mots en attente, utiliser l'endpoint spécifique
    if (contentType === ModerableContentType.WORD) {
      console.log('📝 Container - Chargement du contenu des mots...');

      this.adminApiService
        .getPendingWords()
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error(
              '❌ Container - Erreur lors du chargement des mots en attente:',
              error
            );
            this.moderationStateSubject.next({
              ...newState,
              isLoading: false,
              error: 'Impossible de charger les mots en attente',
            });
            return [];
          })
        )
        .subscribe((response) => {
          console.log(
            '📝 Container - Mots chargés:',
            response.data?.length || 0
          );

          this.moderationStateSubject.next({
            ...newState,
            isLoading: false,
            error: null,
            allModerationContent: response.data || [],
          });
        });
    } else if (contentType === ModerableContentType.LANGUAGE) {
      // Pour les langues en attente, utiliser l'endpoint spécifique
      console.log(
        '🌍 Container - Chargement du contenu des langues pour la liste...'
      );

      this.adminApiService
        .getPendingLanguages()
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error(
              '❌ Container - Erreur lors du chargement des langues en attente:',
              error
            );
            this.moderationStateSubject.next({
              ...currentState,
              isLoading: false,
              error: 'Impossible de charger les langues en attente',
            });
            return [];
          })
        )
        .subscribe((response) => {
          console.log(
            '🌍 Container - Langues chargées pour la liste:',
            response.data
          );
          console.log(
            '🔍 Debug - Contenu complet de la réponse:',
            JSON.stringify(response, null, 2)
          );

          const finalState = {
            ...newState,
            isLoading: false,
            error: null,
            allModerationContent: response.data || [],
          };

          console.log('🔍 Debug - Nouvel état du container pour les langues:', {
            currentView: finalState.currentView,
            selectedCategory: finalState.selectedCategory,
            contentCount: finalState.allModerationContent.length,
            content: finalState.allModerationContent,
          });

          this.moderationStateSubject.next(finalState);
        });
    } else if (contentType === ModerableContentType.CATEGORY) {
      // Pour les catégories en attente, utiliser l'endpoint spécifique
      console.log(
        '📂 Container - Chargement du contenu des catégories pour la liste...'
      );

      this.adminApiService
        .getPendingCategories()
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error(
              '❌ Container - Erreur lors du chargement des catégories en attente:',
              error
            );
            this.moderationStateSubject.next({
              ...newState,
              isLoading: false,
              error: 'Impossible de charger les catégories en attente',
            });
            return [];
          })
        )
        .subscribe((response) => {
          console.log(
            '📂 Container - Catégories chargées pour la liste:',
            response.data
          );
          console.log(
            '🔍 Debug - Contenu complet de la réponse:',
            JSON.stringify(response, null, 2)
          );

          const finalState = {
            ...newState,
            isLoading: false,
            error: null,
            allModerationContent: response.data || [],
          };

          console.log(
            '🔍 Debug - Nouvel état du container pour les catégories:',
            {
              currentView: finalState.currentView,
              selectedCategory: finalState.selectedCategory,
              contentCount: finalState.allModerationContent.length,
              content: finalState.allModerationContent,
            }
          );

          this.moderationStateSubject.next(finalState);
        });
    } else if (contentType === ModerableContentType.CONTRIBUTOR_REQUEST) {
      // Pour les demandes de contributeur, utiliser l'endpoint spécifique
      console.log(
        '🤝 Container - Chargement du contenu des demandes de contributeur pour la liste...'
      );

      this.adminApiService
        .getPendingContributorRequests(1, 20, { status: 'pending' })
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error(
              '❌ Container - Erreur lors du chargement des demandes de contributeur en attente:',
              error
            );
            this.moderationStateSubject.next({
              ...newState,
              isLoading: false,
              error: 'Impossible de charger les demandes de contributeur en attente',
            });
            return [];
          })
        )
        .subscribe((response) => {
          console.log(
            '🤝 Container - Demandes de contributeur chargées pour la liste:',
            response.data
          );
          console.log(
            '🔍 Debug - Contenu complet de la réponse:',
            JSON.stringify(response, null, 2)
          );

          const finalState = {
            ...newState,
            isLoading: false,
            error: null,
            allModerationContent: response.data || [],
          };

          console.log(
            '🔍 Debug - Nouvel état du container pour les demandes de contributeur:',
            {
              currentView: finalState.currentView,
              selectedCategory: finalState.selectedCategory,
              contentCount: finalState.allModerationContent.length,
              content: finalState.allModerationContent,
            }
          );

          this.moderationStateSubject.next(finalState);
        });
    } else {
      // Pour les autres types, utiliser l'endpoint de contenu signalé
      console.log(`📊 Container - Chargement du contenu ${contentType}...`);

      this.adminApiService
        .getAllPendingModerationContent(1, 20, contentType)
        .pipe(
          takeUntil(this.destroy$),
          catchError((error) => {
            console.error(
              `❌ Container - Erreur lors du chargement du contenu ${contentType}:`,
              error
            );
            this.moderationStateSubject.next({
              ...newState,
              isLoading: false,
              error: `Impossible de charger le contenu ${contentType}`,
            });
            return [];
          })
        )
        .subscribe((response) => {
          console.log(
            `📊 Container - Contenu ${contentType} chargé:`,
            response.data?.length || 0,
            'éléments'
          );

          this.moderationStateSubject.next({
            ...newState,
            isLoading: false,
            error: null,
            allModerationContent: response.data || [],
          });
        });
    }
  }

  // ===== MÉTHODES PUBLIQUES POUR LE TEMPLATE =====

  /**
   * Gestion de la recherche
   */
  public onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(target.value);
  }

  /**
   * Gestion du filtre par langue
   */
  public onLanguageFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateFilters({ language: target.value || undefined });
  }

  /**
   * Gestion du filtre par statut
   */
  public onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const status = target.value as ModerationStatus | '';
    this.updateFilters({ status: status || undefined });
  }

  /**
   * Efface tous les filtres
   */
  public clearFilters(): void {
    this.searchTerm = '';
    this.updateFilters({
      language: undefined,
      status: undefined,
      search: undefined,
    });
  }

  /**
   * Vérifie s'il y a des filtres actifs
   */
  public hasActiveFilters(filters: PendingWordFilters): boolean {
    return !!(filters.language || filters.status || filters.search);
  }

  /**
   * Actions de modération
   */
  public moderateWord(wordId: string, status: string): void {
    console.log('Moderate word:', wordId, status);
    // Appel API pour modérer le mot
    this.loadPendingWords(); // Recharger après modération
  }

  public viewWordHistory(wordId: string): void {
    console.log('View word history:', wordId);
    // Afficher l'historique du mot
  }

  /**
   * Pagination
   */
  public goToPage(page: number): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      currentPage: page,
    });
    this.loadPendingWords();
  }

  public hasNextPage(state: ExtendedModerationState): boolean {
    return state.currentPage * state.pageSize < state.totalWords;
  }

  public getTotalPages(state: ExtendedModerationState): number {
    return Math.ceil(state.totalWords / state.pageSize);
  }

  /**
   * Méthodes utilitaires
   */
  public trackByWordId(index: number, word: PendingWord): string {
    return word.id;
  }

  public trackByContentId(index: number, content: ModerableContent): string {
    return (content as any).id || (content as any)._id || index.toString();
  }

  /**
   * Ouvre une demande de contributeur spécifique par ID (pour les liens email)
   */
  private openContributorRequestById(requestId: string): void {
    console.log('🔗 Recherche de la demande de contributeur avec ID:', requestId);

    const currentState = this.moderationStateSubject.value;
    
    // Chercher dans la liste chargée
    const request = currentState.allModerationContent.find(
      (content: any) => (content.id === requestId || content._id === requestId)
    );

    if (request) {
      console.log('✅ Demande de contributeur trouvée, ouverture du modal:', request);
      this.openContentDetail(request);
    } else {
      console.log('⚠️ Demande de contributeur non trouvée dans la liste actuelle, rechargement...');
      // Recharger la catégorie et essayer à nouveau
      this.onCategorySelected({
        contentType: ModerableContentType.CONTRIBUTOR_REQUEST,
        filters: undefined
      });
      
      setTimeout(() => {
        const newState = this.moderationStateSubject.value;
        const foundRequest = newState.allModerationContent.find(
          (content: any) => (content.id === requestId || content._id === requestId)
        );
        
        if (foundRequest) {
          console.log('✅ Demande trouvée après rechargement:', foundRequest);
          this.openContentDetail(foundRequest);
        } else {
          console.error('❌ Demande de contributeur introuvable même après rechargement');
        }
      }, 2000);
    }
  }

  // ===== MÉTHODES UTILITAIRES POUR LE TEMPLATE =====

  /**
   * Obtient le titre d'un contenu selon son type
   */
  public getContentTitle(content: ModerableContent): string {
    if ('word' in content) return `Mot : ${content.word}`;
    if ('name' in content && 'region' in content && 'systemStatus' in content)
      return `Langue : ${content.name}`;
    if ('title' in content) return content.title;
    if ('sender' in content) return `Message de ${content.sender.username}`;
    if ('user' in content) return `Profil de ${content.user.username}`;
    if ('targetType' in content) return `Commentaire sur ${content.targetType}`;
    if ('filename' in content) return `Média : ${content.filename}`;
    if ('aiModel' in content) return 'Contenu détecté par IA';
    
    // Demandes de contributeur - selon le format MongoDB
    if ('username' in content && 'motivation' in content && 'status' in content) {
      return `Demande de contributeur : ${(content as any).username}`;
    }
    if ('firstName' in content && 'lastName' in content && 'motivation' in content)
      return `Demande de contributeur : ${(content as any).firstName} ${(content as any).lastName}`;
      
    return 'Contenu à modérer';
  }

  /**
   * Obtient un aperçu du contenu
   */
  public getContentPreview(content: ModerableContent): string {
    if ('definition' in content) return content.definition;

    // Langues: ont name, region, systemStatus
    if ('name' in content && 'region' in content && 'systemStatus' in content) {
      return `${(content as any).region}${
        (content as any).country ? ' - ' + (content as any).country : ''
      }${
        (content as any).nativeName
          ? ' (' + (content as any).nativeName + ')'
          : ''
      }`;
    }

    // Catégories: ont name, languageId, systemStatus (mais pas region)
    if (
      'name' in content &&
      'languageId' in content &&
      'systemStatus' in content &&
      !('region' in content)
    ) {
      const categoryContent = content as any;
      const languageName =
        categoryContent.languageId &&
        typeof categoryContent.languageId === 'object'
          ? categoryContent.languageId.name ||
            categoryContent.languageId.nativeName
          : 'Langue inconnue';
      return `${categoryContent.name} (${languageName})${
        categoryContent.description
          ? ' - ' + categoryContent.description.substring(0, 50) + '...'
          : ''
      }`;
    }

    if ('content' in content)
      return (content as any).content.substring(0, 150) + '...';
    if ('filename' in content)
      return `Fichier ${(content as any).mediaType}: ${
        (content as any).filename
      }`;
    // Demandes de contributeur - selon le format MongoDB
    if ('username' in content && 'motivation' in content && 'email' in content) {
      const contributorRequest = content as any;
      const languages = contributorRequest.languages 
        ? (typeof contributorRequest.languages === 'string' 
           ? contributorRequest.languages 
           : contributorRequest.languages.map((lang: any) => lang.name || lang).join(', '))
        : 'Non spécifiées';
      const motivation = contributorRequest.motivation
        ? contributorRequest.motivation.substring(0, 100) + (contributorRequest.motivation.length > 100 ? '...' : '')
        : 'Aucune motivation fournie';
      return `Email: ${contributorRequest.email} | Langues: ${languages} | Motivation: ${motivation}`;
    }
    
    // Demandes de contributeur - format alternatif
    if ('firstName' in content && 'lastName' in content && 'motivation' in content) {
      const contributorRequest = content as any;
      const languages = contributorRequest.languages && contributorRequest.languages.length > 0
        ? contributorRequest.languages.map((lang: any) => lang.name || lang).join(', ')
        : 'Non spécifiées';
      const motivation = contributorRequest.motivation
        ? contributorRequest.motivation.substring(0, 100) + '...'
        : 'Aucune motivation fournie';
      return `Langues: ${languages} | Motivation: ${motivation}`;
    }
    return 'Aucun aperçu disponible';
  }

  /**
   * Obtient la date du contenu
   */
  public getContentDate(content: ModerableContent): Date {
    if ('submittedAt' in content) return content.submittedAt;
    if ('createdAt' in content) return content.createdAt;
    if ('reportedAt' in content) return content.reportedAt;
    if ('detectedAt' in content) return content.detectedAt;
    // Demandes de contributeur - selon le format MongoDB
    if ('createdAt' in content && 'username' in content && 'motivation' in content) 
      return new Date((content as any).createdAt);
    if ('requestedAt' in content) return new Date((content as any).requestedAt);
    return new Date();
  }

  /**
   * Obtient l'auteur du contenu
   */
  public getContentAuthor(content: ModerableContent): string {
    if ('submittedBy' in content && typeof content.submittedBy === 'object')
      return content.submittedBy.username;
    if ('author' in content) return content.author.username;
    if ('sender' in content) return content.sender.username;
    if ('uploadedBy' in content) return content.uploadedBy.username;
    // Demandes de contributeur - selon le format MongoDB
    if ('username' in content && 'motivation' in content) 
      return (content as any).username;
    // Demandes de contributeur - utiliser le nom complet
    if ('firstName' in content && 'lastName' in content)
      return `${(content as any).firstName} ${(content as any).lastName}`;
    // Ou utiliser l'utilisateur si disponible
    if ('user' in content && (content as any).user && typeof (content as any).user === 'object')
      return (content as any).user.username || (content as any).user.email;
    return '';
  }

  /**
   * Obtient la priorité d'un contenu
   */
  public getContentPriority(content: ModerableContent): string {
    if ('severity' in content) {
      switch (content.severity) {
        case ReportSeverity.CRITICAL:
          return 'critical';
        case ReportSeverity.HIGH:
          return 'high';
        case ReportSeverity.MEDIUM:
          return 'medium';
        case ReportSeverity.LOW:
          return 'low';
        default:
          return 'medium';
      }
    }
    return 'medium';
  }

  /**
   * Formate une date
   */
  public formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  public getStatusLabel(status: ModerationStatus): string {
    const labels: Record<ModerationStatus, string> = {
      [ModerationStatus.PENDING]: 'En attente',
      [ModerationStatus.APPROVED]: 'Approuvé',
      [ModerationStatus.REJECTED]: 'Rejeté',
    };
    return labels[status] || status;
  }

  public getPendingCount(words: PendingWord[]): number {
    return words.filter((word) => word.status === ModerationStatus.PENDING)
      .length;
  }

  public getTodayModerationCount(): number {
    // Simuler le compte des modérations d'aujourd'hui
    return 12; // À remplacer par un appel API
  }

  public retryLoad(): void {
    console.log('🔄 retryLoad appelé automatiquement !');
    const currentState = this.moderationStateSubject.value;
    console.log('🔄 État actuel dans retryLoad:', {
      currentView: currentState.currentView,
      selectedCategory: currentState.selectedCategory,
    });

    if (currentState.currentView === 'categories') {
      this.loadCategoryStats();
    } else if (currentState.selectedCategory) {
      this.loadCategoryContent(currentState.selectedCategory);
    } else {
      this.loadPendingWords();
    }
  }

  // ===== NOUVEAUX HANDLERS POUR LES COMPOSANTS ÉTENDUS =====

  /**
   * Gère la sélection d'une catégorie depuis le composant moderation-categories
   */
  public onCategorySelected(event: CategoryNavigationEvent): void {
    console.log('🔄 Navigation - Catégorie sélectionnée:', event.contentType);
    this.loadCategoryContent(event.contentType);
  }

  /**
   * Gère la demande de file prioritaire
   */
  public onPriorityQueueRequested(contentType: ModerableContentType): void {
    // Charger uniquement les éléments prioritaires de cette catégorie
    this.loadCategoryContent(contentType);

    // TODO: Filtrer par priorité une fois les données chargées
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      contentFilters: {
        ...currentState.contentFilters,
        severity: ReportSeverity.HIGH, // Simuler un filtre priorité
      },
    });
  }

  /**
   * Gère les actions de modération depuis le modal de détail
   */
  public onContentModerationAction(action: ContentModerationAction): void {
    const { type, content, reason, notes } = action;

    // Déterminer le type de contenu et appeler l'API appropriée
    let contentType: ModerableContentType;
    let apiCall: Observable<any>;

    if ('word' in content) {
      // Pour les mots, utiliser l'endpoint spécifique de modération de mots
      contentType = ModerableContentType.WORD;
      // Pour les mots, seules les actions 'approve' et 'reject' sont supportées
      if (type === 'escalate') {
        console.warn(
          'Action escalate non supportée pour les mots, conversion en reject'
        );
        apiCall = this.adminApiService.moderateWord(content.id, {
          action: 'reject',
          reason: reason || 'Escaladé pour révision',
          notes,
        });
      } else {
        apiCall = this.adminApiService.moderateWord(content.id, {
          action: type,
          reason,
          notes,
        });
      }
    } else if (
      'name' in content &&
      'languageId' in content &&
      'systemStatus' in content &&
      'submittedBy' in content
    ) {
      // Pour les catégories, utiliser l'endpoint spécifique de modération de catégories
      contentType = ModerableContentType.WORD; // Pas de type spécifique pour les catégories
      // Pour les catégories, seules les actions 'approve' et 'reject' sont supportées
      if (type === 'escalate') {
        console.warn(
          'Action escalate non supportée pour les catégories, conversion en reject'
        );
        apiCall = this.adminApiService.moderateCategory(
          content.id,
          'reject',
          reason || 'Escaladé pour révision',
          notes
        );
      } else {
        apiCall = this.adminApiService.moderateCategory(
          content.id,
          type,
          reason,
          notes
        );
      }
    } else if (
      'name' in content &&
      'region' in content &&
      'systemStatus' in content
    ) {
      // Pour les langues, utiliser l'endpoint spécifique de modération de langues
      contentType = ModerableContentType.LANGUAGE;
      // Pour les langues, seules les actions 'approve' et 'reject' sont supportées
      if (type === 'escalate') {
        console.warn(
          'Action escalate non supportée pour les langues, conversion en reject'
        );
        apiCall = this.adminApiService.moderateLanguage(
          content.id,
          'reject',
          reason || 'Escaladé pour révision',
          notes
        );
      } else {
        apiCall = this.adminApiService.moderateLanguage(
          content.id,
          type,
          reason,
          notes
        );
      }
    } else if (
      ('firstName' in content && 'lastName' in content && 'motivation' in content) ||
      ('username' in content && 'motivation' in content && 'email' in content)
    ) {
      // Pour les demandes de contributeur, utiliser l'endpoint spécifique
      contentType = ModerableContentType.CONTRIBUTOR_REQUEST;
      // Pour les demandes de contributeur, seules les actions 'approve' et 'reject' sont supportées
      if (type === 'escalate') {
        console.warn(
          'Action escalate non supportée pour les demandes de contributeur, conversion en reject'
        );
        const requestId = (content as any).id || (content as any)._id;
        apiCall = this.adminApiService.moderateContributorRequest(requestId, {
          decision: 'reject',
          adminComments: notes,
          reasonCode: reason || 'Escaladé pour révision'
        });
      } else {
        const requestId = (content as any).id || (content as any)._id;
        apiCall = this.adminApiService.moderateContributorRequest(requestId, {
          decision: type as 'approve' | 'reject',
          adminComments: notes,
          reasonCode: reason
        });
      }
    } else {
      // Pour les autres types de contenu signalé, utiliser l'endpoint de modération générale
      if ('title' in content && 'community' in content)
        contentType = ModerableContentType.COMMUNITY_POST;
      else if ('sender' in content && 'recipient' in content)
        contentType = ModerableContentType.PRIVATE_MESSAGE;
      else if ('user' in content && 'reportedFields' in content)
        contentType = ModerableContentType.USER_PROFILE;
      else if ('targetType' in content && 'targetId' in content)
        contentType = ModerableContentType.COMMENT;
      else if ('mediaType' in content && 'filename' in content)
        contentType = ModerableContentType.MEDIA_CONTENT;
      else if ('aiModel' in content && 'confidence' in content)
        contentType = ModerableContentType.REPORT;
      else contentType = ModerableContentType.WORD; // fallback

      apiCall = this.adminApiService.moderateContent(
        content.id,
        contentType,
        type,
        reason,
        notes
      );
    }

    apiCall.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        console.log(`Contenu ${type} avec succès:`, content.id);
        // Recharger les données de la catégorie actuelle
        const currentState = this.moderationStateSubject.value;
        if (currentState.selectedCategory) {
          this.loadCategoryContent(currentState.selectedCategory);
        }
        // Fermer le modal
        this.closeContentDetail();
      },
      error: (error) => {
        console.error('Erreur lors de la modération:', error);
        // TODO: Afficher un toast d'erreur
      },
    });
  }

  /**
   * Ouvre les détails d'un contenu dans le modal
   */
  public openContentDetail(content: ModerableContent): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      selectedContent: content,
      currentView: 'detail',
    });
  }

  /**
   * Ferme le modal de détail
   */
  public closeContentDetail(): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      selectedContent: null,
      currentView: currentState.selectedCategory
        ? 'content_list'
        : 'categories',
    });
  }

  /**
   * Retourne à la vue des catégories
   */
  public returnToCategories(): void {
    const currentState = this.moderationStateSubject.value;
    this.moderationStateSubject.next({
      ...currentState,
      currentView: 'categories',
      selectedCategory: null,
      selectedContent: null,
      allModerationContent: [],
      contentFilters: {},
    });
  }

  /**
   * Rafraîchit les statistiques des catégories
   */
  public refreshCategories(): void {
    this.loadCategoryStats();
  }

  // ===== MÉTHODES POUR MODERATION PANEL COMPONENT =====

  /**
   * Convertit les PendingWord en ModerationItem pour le composant moderation-panel
   */
  public convertToModerationItems(pendingWords: PendingWord[]): any[] {
    return pendingWords.map((word) => ({
      id: word.id,
      type: 'word' as const,
      content: word.definition || word.word,
      originalContent: word.word,
      author: {
        id: word.submittedBy,
        username: word.submittedBy, // Utiliser l'ID comme fallback
        email: '', // Non disponible dans PendingWord
        profilePicture: undefined,
      },
      submittedAt: word.submittedAt,
      status: word.status,
      priority: 'medium' as const, // Priorité par défaut
      flags: [],
      reportCount: 0,
      assignedTo: undefined,
      language: word.language,
      context: {
        communityId: undefined,
        communityName: undefined,
        parentId: undefined,
      },
      metadata: {
        originalWord: word.word,
        wordType: 'pending',
      },
    }));
  }

  /**
   * Gère les actions émises par le composant moderation-panel
   */
  public handleModerationAction(action: any): void {
    switch (action.type) {
      case 'approve':
        this.moderateWord(action.item.id, 'approved');
        break;
      case 'reject':
        this.moderateWord(action.item.id, 'rejected');
        break;
      case 'view_history':
        this.viewWordHistory(action.item.id);
        break;
      default:
        console.warn('Action de modération non gérée:', action.type);
    }
  }

  /**
   * Gère les actions en lot émises par le composant moderation-panel
   */
  public handleBulkModerationAction(action: any): void {
    const { type, items } = action;
    const wordIds = items.map((item: any) => item.id);

    switch (type) {
      case 'bulk_approve':
        this.bulkModerateWords(wordIds, 'approved', 'Approbation en lot');
        break;
      case 'bulk_reject':
        this.bulkModerateWords(wordIds, 'rejected', 'Rejet en lot');
        break;
      case 'export':
        this.exportModerationData(wordIds);
        break;
      default:
        console.warn('Action en lot non gérée:', type);
    }
  }

  /**
   * Modère plusieurs mots en une seule opération
   */
  private bulkModerateWords(
    wordIds: string[],
    status: string,
    reason?: string
  ): void {
    this.adminApiService
      .bulkModerateWords(wordIds, status, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log(
            `${wordIds.length} mots ${
              status === 'approved' ? 'approuvés' : 'rejetés'
            }`
          );
          this.loadPendingWords();
        },
        error: (error) => {
          console.error('Erreur lors de la modération en lot:', error);
        },
      });
  }

  /**
   * Exporte les données de modération sélectionnées
   */
  private exportModerationData(wordIds?: string[]): void {
    this.adminApiService
      .exportWords(wordIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const blob = new Blob([data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `moderation-export-${
            new Date().toISOString().split('T')[0]
          }.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error("Erreur lors de l'export:", error);
        },
      });
  }
}
