import { Component, Input, OnInit } from '@angular/core';
import {
  DictionaryService,
  RevisionHistory,
} from '../../../core/services/dictionary.service';

@Component({
  selector: 'app-revision-history',
  standalone: false,
  templateUrl: './revision-history.component.html',
  styleUrls: ['./revision-history.component.scss'],
})
export class RevisionHistoryComponent implements OnInit {
  @Input() wordId: string = '';

  revisions: RevisionHistory[] = [];
  isLoading = false;
  error = '';

  constructor(private dictionaryService: DictionaryService) {}

  ngOnInit(): void {
    if (this.wordId) {
      this.loadRevisionHistory();
    }
  }

  loadRevisionHistory(): void {
    this.isLoading = true;
    this.error = '';

    this.dictionaryService.getRevisionHistory(this.wordId).subscribe({
      next: (revisions) => {
        this.revisions = revisions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading revision history:', error);
        this.error = "Erreur lors du chargement de l'historique des révisions";
        this.isLoading = false;
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Approuvée';
      case 'rejected':
        return 'Rejetée';
      default:
        return status;
    }
  }

  getChangeTypeIcon(changeType: string): string {
    switch (changeType) {
      case 'added':
        return 'M12 6v6m0 0v6m0-6h6m-6 0H6';
      case 'modified':
        return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
      case 'removed':
        return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getChangeTypeColor(changeType: string): string {
    switch (changeType) {
      case 'added':
        return 'text-green-600';
      case 'modified':
        return 'text-blue-600';
      case 'removed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getChangeTypeText(changeType: string): string {
    switch (changeType) {
      case 'added':
        return 'Ajouté';
      case 'modified':
        return 'Modifié';
      case 'removed':
        return 'Supprimé';
      default:
        return changeType;
    }
  }

  formatFieldName(field: string): string {
    const fieldMap: { [key: string]: string } = {
      pronunciation: 'Prononciation',
      etymology: 'Étymologie',
      meanings: 'Significations',
      translations: 'Traductions',
      languageVariants: 'Variantes linguistiques',
      audioFiles: 'Fichiers audio',
    };

    return fieldMap[field] || field;
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'Aucune valeur';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return `${value.length} élément(s)`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value).substring(0, 50) + '...';
    }

    return String(value);
  }

  hasSignificantChanges(changes: any[]): boolean {
    return changes.some(
      (change) =>
        change.field !== 'updatedAt' && change.field !== 'revisionNotes'
    );
  }
}
