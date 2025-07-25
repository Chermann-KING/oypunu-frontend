import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ContributorRequestService } from '../../../../core/services/contributor-request.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CreateContributorRequestDto } from '../../../../core/models/contributor-request';

@Component({
  selector: 'app-contributor-request',
  standalone: false,
  templateUrl: './contributor-request.component.html',
  styleUrls: ['./contributor-request.component.scss']
})
export class ContributorRequestComponent implements OnInit {
  requestForm: FormGroup;
  isSubmitting = false;
  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private contributorRequestService: ContributorRequestService,
    private toastService: ToastService,
    public router: Router
  ) {
    this.requestForm = this.fb.group({
      motivation: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(1000)]],
      experience: ['', [Validators.maxLength(500)]],
      languages: ['', [Validators.maxLength(200)]],
      commitment: [false, Validators.requiredTrue],
      linkedIn: ['', [Validators.pattern(/^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/)]],
      github: ['', [Validators.pattern(/^https?:\/\/(www\.)?github\.com\/[\w-]+\/?$/)]],
      portfolio: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  onSubmit(): void {
    if (this.requestForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const requestData: CreateContributorRequestDto = {
        motivation: this.requestForm.value.motivation,
        experience: this.requestForm.value.experience || undefined,
        languages: this.requestForm.value.languages || undefined,
        commitment: this.requestForm.value.commitment,
        linkedIn: this.requestForm.value.linkedIn || undefined,
        github: this.requestForm.value.github || undefined,
        portfolio: this.requestForm.value.portfolio || undefined
      };

      this.contributorRequestService.createRequest(requestData).subscribe({
        next: (response) => {
          this.toastService.success(
            'Demande envoyée',
            'Votre demande a été envoyée avec succès ! Vous recevrez une réponse par email sous 3-5 jours ouvrables.'
          );
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Erreur lors de l\'envoi de la demande:', error);
          
          if (error.status === 409) {
            this.toastService.error('Demande existante', 'Vous avez déjà une demande en cours de traitement.');
          } else if (error.status === 400) {
            const errorMessage = error.error?.message || 'Données invalides. Veuillez vérifier votre formulaire.';
            this.toastService.error('Données invalides', errorMessage);
          } else {
            this.toastService.error('Erreur', 'Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.');
          }
        }
      });
    }
  }

  get motivationLength(): number {
    return this.requestForm.get('motivation')?.value?.length || 0;
  }

  get experienceLength(): number {
    return this.requestForm.get('experience')?.value?.length || 0;
  }

  get languagesLength(): number {
    return this.requestForm.get('languages')?.value?.length || 0;
  }

  get linkedInLength(): number {
    return this.requestForm.get('linkedIn')?.value?.length || 0;
  }

  get githubLength(): number {
    return this.requestForm.get('github')?.value?.length || 0;
  }

  get portfolioLength(): number {
    return this.requestForm.get('portfolio')?.value?.length || 0;
  }
}