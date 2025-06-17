import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ProfileService,
  UpdateProfileData,
} from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user';

@Component({
  selector: 'app-profile-edit',
  standalone: false,
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss'],
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  successMessage: string | null = null;
  currentUser: User | null = null;

  availableLanguages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'Anglais' },
    { code: 'es', name: 'Espagnol' },
    { code: 'de', name: 'Allemand' },
    { code: 'it', name: 'Italien' },
    { code: 'pt', name: 'Portugais' },
  ];

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
        ],
      ],
      bio: ['', [Validators.maxLength(500)]],
      nativeLanguage: [''],
      learningLanguages: [[]],
      location: [''],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      isProfilePublic: [true],
    });
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.error = null;

    const profileSub = this.profileService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.populateForm(user);
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement du profil';
        this.isLoading = false;
        console.error('Error loading profile:', error);
      },
    });

    this.subscriptions.add(profileSub);
  }

  private populateForm(user: User): void {
    this.profileForm.patchValue({
      username: user.username || '',
      bio: user.bio || '',
      nativeLanguage: user.nativeLanguage || '',
      learningLanguages: user.learningLanguages || [],
      location: user.location || '',
      website: user.website || '',
      isProfilePublic: user.isProfilePublic !== false,
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving = true;
    this.error = null;
    this.successMessage = null;

    const formValue = this.profileForm.value;
    const updateData: UpdateProfileData = {
      username: formValue.username,
      bio: formValue.bio,
      nativeLanguage: formValue.nativeLanguage,
      learningLanguages: formValue.learningLanguages,
      location: formValue.location,
      website: formValue.website,
      isProfilePublic: formValue.isProfilePublic,
    };

    const updateSub = this.profileService.updateProfile(updateData).subscribe({
      next: (updatedUser) => {
        this.successMessage = 'Profil mis à jour avec succès !';
        this.isSaving = false;

        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 2000);
      },
      error: (error) => {
        this.error =
          error.error?.message || 'Erreur lors de la mise à jour du profil';
        this.isSaving = false;
        console.error('Error updating profile:', error);
      },
    });

    this.subscriptions.add(updateSub);
  }

  onCancel(): void {
    this.router.navigate(['/profile']);
  }

  onLanguageChange(language: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const isLearning = target.checked;

    const learningLanguages =
      this.profileForm.get('learningLanguages')?.value || [];

    if (isLearning) {
      if (!learningLanguages.includes(language)) {
        learningLanguages.push(language);
      }
    } else {
      const index = learningLanguages.indexOf(language);
      if (index > -1) {
        learningLanguages.splice(index, 1);
      }
    }

    this.profileForm.patchValue({ learningLanguages });
  }

  isLanguageLearning(language: string): boolean {
    const learningLanguages =
      this.profileForm.get('learningLanguages')?.value || [];
    return learningLanguages.includes(language);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach((key) => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const field = this.profileForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} est requis`;
      if (field.errors['minlength'])
        return `${fieldName} doit contenir au moins ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength'])
        return `${fieldName} ne peut pas dépasser ${field.errors['maxlength'].requiredLength} caractères`;
      if (field.errors['pattern'])
        return 'Format invalide (doit commencer par http:// ou https://)';
    }
    return null;
  }

  getInitials(): string {
    if (!this.currentUser?.username) return '';
    return this.currentUser.username.charAt(0).toUpperCase();
  }

  getLanguageName(languageCode: string): string {
    if (!languageCode) return '';
    const language = this.availableLanguages.find(
      (lang) => lang.code === languageCode
    );
    return language?.name || languageCode;
  }
}
