import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ContributorRequestService } from '../../../../core/services/contributor-request.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  ContributorRequest,
  ContributorRequestFilters,
  ContributorRequestListResponse,
  ContributorRequestStatus,
  ContributorRequestPriority,
  ContributorRequestHelper,
  ReviewContributorRequestDto,
  UpdateContributorRequestPriorityDto,
} from '../../../../core/models/contributor-request';

@Component({
  selector: 'app-contributor-requests',
  standalone: false,
  templateUrl: './contributor-requests.component.html',
  styleUrls: ['./contributor-requests.component.scss']
})
export class ContributorRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // État du composant
  requests: ContributorRequest[] = [];
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalRequests = 0;

  // Statistiques
  statistics: any = {};

  // Filtres
  filtersForm!: FormGroup;
  showAdvancedFilters = false;

  // Sélection multiple
  selectedRequests: Set<string> = new Set();
  selectAll = false;

  // Modals
  showReviewModal = false;
  showBulkActionModal = false;
  showDetailModal = false;
  selectedRequest: ContributorRequest | null = null;

  // Actions
  reviewForm!: FormGroup;
  priorityForm!: FormGroup;
  bulkActionForm!: FormGroup;

  // Constantes pour les templates
  readonly StatusEnum = ContributorRequestStatus;
  readonly PriorityEnum = ContributorRequestPriority;
  readonly Helper = ContributorRequestHelper;

  // Options pour les dropdowns
  readonly statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: ContributorRequestStatus.PENDING, label: 'En attente' },
    { value: ContributorRequestStatus.UNDER_REVIEW, label: 'En révision' },
    { value: ContributorRequestStatus.APPROVED, label: 'Approuvées' },
    { value: ContributorRequestStatus.REJECTED, label: 'Rejetées' },
  ];

  readonly priorityOptions = [
    { value: '', label: 'Toutes les priorités' },
    { value: ContributorRequestPriority.LOW, label: 'Faible' },
    { value: ContributorRequestPriority.MEDIUM, label: 'Moyenne' },
    { value: ContributorRequestPriority.HIGH, label: 'Élevée' },
    { value: ContributorRequestPriority.URGENT, label: 'Urgente' },
  ];

  readonly reviewStatusOptions = [
    { value: ContributorRequestStatus.APPROVED, label: 'Approuver', class: 'bg-green-600 hover:bg-green-700' },
    { value: ContributorRequestStatus.REJECTED, label: 'Rejeter', class: 'bg-red-600 hover:bg-red-700' },
    { value: ContributorRequestStatus.UNDER_REVIEW, label: 'Mettre en révision', class: 'bg-blue-600 hover:bg-blue-700' },
  ];

  constructor(
    private contributorRequestService: ContributorRequestService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.loadRequests();
    this.loadStatistics();
    
    // Auto-refresh toutes les 30 secondes
    setInterval(() => {
      if (!this.showReviewModal && !this.showBulkActionModal) {
        this.loadRequests(false);
      }
    }, 30000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.filtersForm = this.fb.group({
      status: [''],
      priority: [''],
      search: [''],
      highPriorityOnly: [false],
      specialReviewOnly: [false],
      expiringSoon: [false],
      maxDaysOld: [''],
    });

    this.reviewForm = this.fb.group({
      status: [''],
      reviewNotes: [''],
      rejectionReason: [''],
      evaluationScore: [''],
      evaluationCriteria: [[]],
      isHighPriority: [false],
      requiresSpecialReview: [false],
    });

    this.priorityForm = this.fb.group({
      priority: [''],
      reason: [''],
    });

    this.bulkActionForm = this.fb.group({
      action: [''],
      notes: [''],
    });
  }

  private setupFormSubscriptions(): void {
    // Recherche en temps réel
    this.filtersForm.get('search')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadRequests();
      });

    // Autres filtres
    this.filtersForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadRequests();
      });
  }

  // === CHARGEMENT DES DONNÉES ===

  loadRequests(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }
    this.error = null;

    const filters = this.getFiltersFromForm();
    
    this.contributorRequestService.getRequests(this.currentPage, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ContributorRequestListResponse) => {
          this.requests = response.requests;
          this.totalRequests = response.total;
          this.totalPages = response.totalPages;
          this.statistics = response.statistics;
          this.loading = false;
          
          // Réinitialiser la sélection
          this.selectedRequests.clear();
          this.selectAll = false;
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement des demandes';
          this.loading = false;
          this.toastService.error('Erreur', 'Erreur lors du chargement des demandes');
          console.error('Erreur:', error);
        }
      });
  }

  loadStatistics(): void {
    this.contributorRequestService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          // Les statistiques sont déjà incluses dans loadRequests
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
        }
      });
  }

  private getFiltersFromForm(): ContributorRequestFilters {
    const formValue = this.filtersForm.value;
    const filters: ContributorRequestFilters = {};

    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        (filters as any)[key] = value;
      }
    });

    return filters;
  }

  // === PAGINATION ===

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRequests();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadRequests();
  }

  // === SÉLECTION MULTIPLE ===

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    
    if (this.selectAll) {
      this.requests.forEach(request => {
        this.selectedRequests.add(request._id);
      });
    } else {
      this.selectedRequests.clear();
    }
  }

  toggleSelectRequest(requestId: string): void {
    if (this.selectedRequests.has(requestId)) {
      this.selectedRequests.delete(requestId);
    } else {
      this.selectedRequests.add(requestId);
    }

    this.selectAll = this.selectedRequests.size === this.requests.length;
  }

  isRequestSelected(requestId: string): boolean {
    return this.selectedRequests.has(requestId);
  }

  getSelectedCount(): number {
    return this.selectedRequests.size;
  }

  // === ACTIONS SUR LES DEMANDES ===

  openReviewModal(request: ContributorRequest): void {
    this.selectedRequest = request;
    this.reviewForm.patchValue({
      status: '',
      reviewNotes: '',
      rejectionReason: '',
      evaluationScore: request.evaluationScore || '',
      evaluationCriteria: request.evaluationCriteria || [],
      isHighPriority: request.isHighPriority,
      requiresSpecialReview: request.requiresSpecialReview,
    });
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedRequest = null;
    this.reviewForm.reset();
  }

  submitReview(): void {
    if (!this.selectedRequest || this.reviewForm.invalid) {
      return;
    }

    const reviewData: ReviewContributorRequestDto = this.reviewForm.value;
    
    // Validation pour le rejet
    if (reviewData.status === ContributorRequestStatus.REJECTED && !reviewData.rejectionReason) {
      this.toastService.error('Validation requise', 'Une raison de rejet est requise');
      return;
    }

    this.contributorRequestService.reviewRequest(this.selectedRequest._id, reviewData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.toastService.success('Succès', 'Demande révisée avec succès');
          this.closeReviewModal();
          this.loadRequests();
          this.loadStatistics();
        },
        error: (error) => {
          this.toastService.error('Erreur', 'Erreur lors de la révision');
          console.error('Erreur:', error);
        }
      });
  }

  openDetailModal(request: ContributorRequest): void {
    this.selectedRequest = request;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedRequest = null;
  }

  updatePriority(request: ContributorRequest, priority: ContributorRequestPriority): void {
    const priorityData: UpdateContributorRequestPriorityDto = {
      priority,
      reason: `Priorité modifiée par l'admin`
    };

    this.contributorRequestService.updatePriority(request._id, priorityData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Succès', 'Priorité mise à jour');
          this.loadRequests();
        },
        error: (error) => {
          this.toastService.error('Erreur', 'Erreur lors de la mise à jour de la priorité');
          console.error('Erreur:', error);
        }
      });
  }

  // === ACTIONS EN LOT ===

  openBulkActionModal(): void {
    if (this.selectedRequests.size === 0) {
      this.toastService.warning('Sélection requise', 'Veuillez sélectionner au moins une demande');
      return;
    }
    this.showBulkActionModal = true;
  }

  closeBulkActionModal(): void {
    this.showBulkActionModal = false;
    this.bulkActionForm.reset();
  }

  submitBulkAction(): void {
    if (this.bulkActionForm.invalid || this.selectedRequests.size === 0) {
      return;
    }

    const bulkData = {
      requestIds: Array.from(this.selectedRequests),
      action: this.bulkActionForm.value.action,
      notes: this.bulkActionForm.value.notes,
    };

    this.contributorRequestService.bulkAction(bulkData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toastService.success(
            'Action en lot terminée',
            `Action appliquée: ${result.success} succès, ${result.failed} échecs`
          );
          this.closeBulkActionModal();
          this.selectedRequests.clear();
          this.selectAll = false;
          this.loadRequests();
          this.loadStatistics();
        },
        error: (error) => {
          this.toastService.error('Erreur', 'Erreur lors de l\'action en lot');
          console.error('Erreur:', error);
        }
      });
  }

  // === UTILITAIRES ===

  resetFilters(): void {
    this.filtersForm.reset();
    this.showAdvancedFilters = false;
    this.currentPage = 1;
    this.loadRequests();
  }

  exportRequests(): void {
    const filters = this.getFiltersFromForm();
    
    this.contributorRequestService.exportRequests(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `demandes-contribution-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.toastService.success('Export', 'Export terminé');
        },
        error: (error) => {
          this.toastService.error('Erreur', 'Erreur lors de l\'export');
          console.error('Erreur:', error);
        }
      });
  }

  refreshData(): void {
    this.loadRequests();
    this.loadStatistics();
    this.toastService.success('Actualisation', 'Données actualisées');
  }

  getStatusBadgeClass(status: ContributorRequestStatus): string {
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ContributorRequestHelper.getStatusColor(status)}`;
  }

  getPriorityBadgeClass(priority: ContributorRequestPriority): string {
    return `inline-flex items-center px-2 py-1 rounded text-xs font-medium ${ContributorRequestHelper.getPriorityColor(priority)}`;
  }

  getDaysOldText(createdAt: Date): string {
    const days = ContributorRequestHelper.getDaysOld(createdAt);
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    return `Il y a ${days} jours`;
  }

  isExpiringSoon(request: ContributorRequest): boolean {
    return ContributorRequestHelper.isExpiringSoon(request.expiresAt);
  }

  isExpired(request: ContributorRequest): boolean {
    return ContributorRequestHelper.isExpired(request.expiresAt);
  }

  getMotivationPreview(motivation: string): string {
    return ContributorRequestHelper.formatMotivation(motivation, 150);
  }

  trackByRequestId(index: number, request: ContributorRequest): string {
    return request._id;
  }
}