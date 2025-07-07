import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

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
    public router: Router
  ) {
    this.requestForm = this.fb.group({
      motivation: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(1000)]],
      experience: ['', [Validators.maxLength(500)]],
      languages: ['', [Validators.maxLength(200)]],
      commitment: [false, Validators.requiredTrue]
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
      
      const requestData = {
        ...this.requestForm.value,
        userId: this.currentUser.id,
        username: this.currentUser.username,
        email: this.currentUser.email
      };

      // TODO: Implémenter l'API call
      console.log('Demande de contributeur:', requestData);
      
      // Simulation d'envoi
      setTimeout(() => {
        this.isSubmitting = false;
        alert('Votre demande a été envoyée ! Vous recevrez une réponse par email.');
        this.router.navigate(['/home']);
      }, 1000);
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
}