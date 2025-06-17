import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { PendingWord, PendingWordsData } from '../../../../core/models/admin';

@Component({
  selector: 'app-word-moderation',
  standalone: false,
  templateUrl: './word-moderation.component.html',
  styleUrl: './word-moderation.component.scss',
})
export class WordModerationComponent implements OnInit, OnDestroy {
  words: PendingWord[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  // Pagination
  currentPage = 1;
  totalPages = 0;
  totalWords = 0;
  limit = 20;

  // Filtres
  filterForm: FormGroup;
  languages = ['français', 'wolof', 'anglais', 'arabe'];

  // Actions
  actionInProgress = false;

  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      language: [''],
    });
  }

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.loadPendingWords();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions(): void {
    this.filterForm
      .get('language')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadPendingWords();
      });
  }

  loadPendingWords(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const language = this.filterForm.get('language')?.value || undefined;

    this.adminService
      .getPendingWords(this.currentPage, this.limit, language)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: PendingWordsData) => {
          this.words = data.words;
          this.totalWords = data.total;
          this.totalPages = data.totalPages;
          this.isLoading = false;
        },
        error: (error) => {
          console.error(
            'Erreur lors du chargement des mots en attente:',
            error
          );
          this.errorMessage = 'Erreur lors du chargement des mots en attente';
          this.isLoading = false;
        },
      });
  }

  // === PAGINATION ===
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadPendingWords();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  // === MODÉRATION DES MOTS ===
  async approveWord(word: PendingWord): Promise<void> {
    if (this.actionInProgress) return;

    this.actionInProgress = true;

    try {
      const result = await this.adminService
        .moderateWord(word._id, 'approve')
        .toPromise();

      if (result?.success) {
        // Retirer le mot de la liste
        this.words = this.words.filter((w) => w._id !== word._id);
        this.totalWords--;

        // Si plus de mots sur cette page, aller à la page précédente
        if (this.words.length === 0 && this.currentPage > 1) {
          this.currentPage--;
          this.loadPendingWords();
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      this.errorMessage = "Erreur lors de l'approbation du mot";
    } finally {
      this.actionInProgress = false;
    }
  }

  async rejectWord(word: PendingWord, reason?: string): Promise<void> {
    if (this.actionInProgress) return;

    // Demander la raison du rejet
    if (!reason) {
      reason = prompt('Raison du rejet (optionnel):') || undefined;
    }

    this.actionInProgress = true;

    try {
      const result = await this.adminService
        .moderateWord(word._id, 'reject', reason)
        .toPromise();

      if (result?.success) {
        // Retirer le mot de la liste
        this.words = this.words.filter((w) => w._id !== word._id);
        this.totalWords--;

        // Si plus de mots sur cette page, aller à la page précédente
        if (this.words.length === 0 && this.currentPage > 1) {
          this.currentPage--;
          this.loadPendingWords();
        }
      }
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      this.errorMessage = 'Erreur lors du rejet du mot';
    } finally {
      this.actionInProgress = false;
    }
  }

  // === UTILITAIRES ===
  clearFilters(): void {
    this.filterForm.reset({
      language: '',
    });
  }

  refresh(): void {
    this.loadPendingWords();
  }

  clearError(): void {
    this.errorMessage = null;
  }

  // === MÉTHODES POUR LE TEMPLATE ===
  trackByWordId(index: number, word: PendingWord): string {
    return word._id;
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, this.currentPage + halfVisible);

      if (this.currentPage <= halfVisible) {
        endPage = maxVisiblePages;
      } else if (this.currentPage > this.totalPages - halfVisible) {
        startPage = this.totalPages - maxVisiblePages + 1;
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          pages.push('...');
        }
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // === NOUVELLES MÉTHODES POUR L'AFFICHAGE COMPLET ===

  /**
   * Calcule le nombre total de définitions pour un mot
   */
  getTotalDefinitions(word: PendingWord): number {
    if (!word.meanings || word.meanings.length === 0) return 0;

    return word.meanings.reduce((total: number, meaning: any) => {
      return total + (meaning.definitions ? meaning.definitions.length : 0);
    }, 0);
  }

  /**
   * Calcule le nombre total d'exemples pour un mot
   */
  getTotalExamples(word: PendingWord): number {
    if (!word.meanings || word.meanings.length === 0) return 0;

    let total = 0;
    word.meanings.forEach((meaning: any) => {
      // Exemples généraux de la signification
      if (meaning.examples) {
        total += meaning.examples.length;
      }

      // Exemples dans chaque définition
      if (meaning.definitions) {
        meaning.definitions.forEach((definition: any) => {
          if (definition.examples) {
            total += definition.examples.length;
          }
        });
      }
    });

    return total;
  }

  /**
   * Vérifie si un mot a des synonymes
   */
  hasSynonyms(word: PendingWord): boolean {
    return (
      word.meanings?.some(
        (meaning: any) => meaning.synonyms && meaning.synonyms.length > 0
      ) || false
    );
  }

  /**
   * Vérifie si un mot a des antonymes
   */
  hasAntonyms(word: PendingWord): boolean {
    return (
      word.meanings?.some(
        (meaning: any) => meaning.antonyms && meaning.antonyms.length > 0
      ) || false
    );
  }

  /**
   * Joue un fichier audio phonétique
   */
  playAudio(audioUrl: string): void {
    try {
      const audio = new Audio(audioUrl);
      audio.play().catch((error) => {
        console.error('Erreur lors de la lecture audio:', error);
        // Optionnel : afficher un message d'erreur à l'utilisateur
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'objet Audio:", error);
    }
  }

  /**
   * Obtient la liste des parties du discours pour un mot
   */
  getPartsOfSpeech(word: PendingWord): string[] {
    if (!word.meanings || word.meanings.length === 0) return [];

    return word.meanings
      .map((meaning: any) => meaning.partOfSpeech)
      .filter((pos: string) => pos && pos.trim() !== '')
      .filter(
        (pos: string, index: number, array: string[]) =>
          array.indexOf(pos) === index
      ); // Unique values
  }

  /**
   * Vérifie si un mot est complexe (plusieurs significations ou beaucoup de contenu)
   */
  isComplexWord(word: PendingWord): boolean {
    const meaningsCount = word.meanings?.length || 0;
    const definitionsCount = this.getTotalDefinitions(word);
    const examplesCount = this.getTotalExamples(word);

    return meaningsCount > 1 || definitionsCount > 2 || examplesCount > 3;
  }

  // Méthodes héritées conservées pour compatibilité (si nécessaire)
  getWordDefinition(word: PendingWord): string {
    if (word.meanings && word.meanings.length > 0) {
      const firstMeaning = word.meanings[0];
      if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
        return firstMeaning.definitions[0].definition || 'Aucune définition';
      }
    }
    return 'Aucune définition';
  }

  getWordExample(word: PendingWord): string | null {
    if (word.meanings && word.meanings.length > 0) {
      const firstMeaning = word.meanings[0];
      if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
        return firstMeaning.definitions[0].example || null;
      }
    }
    return null;
  }

  getWordCategory(word: PendingWord): string {
    if (word.meanings && word.meanings.length > 0) {
      return word.meanings[0].partOfSpeech || 'Non spécifié';
    }
    return 'Non spécifié';
  }
}
