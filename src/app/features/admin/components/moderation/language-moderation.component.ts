import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import {
  LanguagesService,
  Language,
} from '../../../../core/services/languages.service';

@Component({
  selector: 'app-language-moderation',
  standalone: false,
  templateUrl: './language-moderation.component.html',
  styleUrls: ['./language-moderation.component.scss'],
})
export class LanguageModerationComponent implements OnInit {
  pendingLanguages: Language[] = [];
  selectedLanguage: Language | null = null;
  isLoading = true;
  error = '';

  // Formulaires d'action
  showApprovalForm = false;
  showRejectionForm = false;
  approvalNotes = '';
  isFeatured = false;
  rejectionReason = '';
  rejectionNotes = '';

  // États d'action
  isSubmitting = false;

  constructor(
    private languagesService: LanguagesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPendingLanguages();
  }

  loadPendingLanguages(): void {
    console.log('🔄 Chargement des langues en attente...');
    console.log('👤 Utilisateur actuel:', this.authService.getCurrentUser());
    console.log('🔐 A les droits admin?', this.canApproveLanguages);

    this.isLoading = true;
    this.error = '';

    this.languagesService.getPendingLanguages().subscribe({
      next: (languages) => {
        console.log('✅ Langues en attente reçues:', languages);
        this.pendingLanguages = languages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(
          '❌ Erreur lors du chargement des langues en attente:',
          error
        );
        console.error("📋 Détails de l'erreur:", {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url,
        });
        this.error = `Erreur lors du chargement des langues en attente (${
          error.status || 'Réseau'
        })`;
        this.isLoading = false;
      },
    });
  }

  selectLanguage(language: Language): void {
    this.selectedLanguage = language;
    this.resetForms();
  }

  resetForms(): void {
    this.showApprovalForm = false;
    this.showRejectionForm = false;
    this.approvalNotes = '';
    this.isFeatured = false;
    this.rejectionReason = '';
    this.rejectionNotes = '';
  }

  showApproval(): void {
    this.showApprovalForm = true;
    this.showRejectionForm = false;
  }

  showRejection(): void {
    this.showRejectionForm = true;
    this.showApprovalForm = false;
  }

  cancelAction(): void {
    this.resetForms();
  }

  approveLanguage(): void {
    if (!this.selectedLanguage) return;

    this.isSubmitting = true;

    const approvalData = {
      approvalNotes: this.approvalNotes.trim() || undefined,
      isFeatured: this.isFeatured,
    };

    this.languagesService
      .approveLanguage(this.selectedLanguage._id, approvalData)
      .subscribe({
        next: (approvedLanguage) => {
          // Retirer la langue de la liste des langues en attente
          this.pendingLanguages = this.pendingLanguages.filter(
            (l) => l._id !== approvedLanguage._id
          );
          this.selectedLanguage = null;
          this.resetForms();
          this.isSubmitting = false;

          // Message de succès (vous pouvez ajouter un toast/snackbar)
          console.log('Langue approuvée avec succès:', approvedLanguage.name);
        },
        error: (error) => {
          console.error("Erreur lors de l'approbation:", error);
          this.error = "Erreur lors de l'approbation de la langue";
          this.isSubmitting = false;
        },
      });
  }

  rejectLanguage(): void {
    if (!this.selectedLanguage || !this.rejectionReason.trim()) return;

    this.isSubmitting = true;

    const rejectionData = {
      rejectionReason: this.rejectionReason.trim(),
      suggestions: this.rejectionNotes.trim() || undefined,
    };

    this.languagesService
      .rejectLanguage(this.selectedLanguage._id, rejectionData)
      .subscribe({
        next: (rejectedLanguage) => {
          // Retirer la langue de la liste des langues en attente
          this.pendingLanguages = this.pendingLanguages.filter(
            (l) => l._id !== rejectedLanguage._id
          );
          this.selectedLanguage = null;
          this.resetForms();
          this.isSubmitting = false;

          // Message de succès
          console.log('Langue rejetée:', rejectedLanguage.name);
        },
        error: (error) => {
          console.error('Erreur lors du rejet:', error);
          this.error = 'Erreur lors du rejet de la langue';
          this.isSubmitting = false;
        },
      });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'active':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getEndangermentIcon(status?: string): string {
    return this.languagesService.getEndangermentIcon(status || 'unknown');
  }

  getEndangermentLabel(status?: string): string {
    return this.languagesService.getEndangermentLabel(status || 'unknown');
  }

  formatSpeakerCount(count?: number): string {
    if (!count) return 'Non spécifié';
    return this.languagesService.formatSpeakerCount(count);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getProposedByName(proposedBy: any): string {
    if (!proposedBy) return 'Inconnu';

    // Si c'est un objet User complet
    if (typeof proposedBy === 'object' && proposedBy.username) {
      return proposedBy.username;
    }

    // Si c'est juste un string (ID ou nom)
    if (typeof proposedBy === 'string') {
      return proposedBy;
    }

    return 'Utilisateur anonyme';
  }

  get canApproveLanguages(): boolean {
    return this.authService.hasMinimumRole('admin');
  }
}
