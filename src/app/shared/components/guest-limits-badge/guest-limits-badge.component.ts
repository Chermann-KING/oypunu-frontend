import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { GuestLimitsService } from '../../../core/services/guest-limits.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-guest-limits-badge',
  standalone: false,
  template: `
    <div *ngIf="showBadge" class="fixed top-4 right-4 z-50">
      <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-lg border border-orange-300 max-w-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <span class="text-sm mr-2">👀</span>
            <div class="text-sm">
              <div class="font-semibold">Visiteur</div>
              <div class="text-xs opacity-90">
                {{stats.wordsRemaining}} mots • {{stats.communitiesRemaining}} communautés
              </div>
            </div>
          </div>
          <button 
            (click)="redirectToSignup()"
            class="ml-3 bg-white text-orange-600 px-2 py-1 rounded text-xs font-semibold hover:bg-orange-50 transition-colors">
            S'inscrire
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .z-50 {
      z-index: 50;
    }
  `]
})
export class GuestLimitsBadgeComponent implements OnInit, OnDestroy {
  showBadge = false;
  stats = {
    wordsRemaining: 0,
    communitiesRemaining: 0,
    totalWordsViewed: 0,
    totalCommunitiesViewed: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private guestLimitsService: GuestLimitsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Afficher le badge seulement pour les visiteurs non authentifiés
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.showBadge = !user;
        if (this.showBadge) {
          this.updateStats();
        }
      });

    // Écouter les changements de limites
    if (!this.authService.isAuthenticated()) {
      this.guestLimitsService.limits$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateStats();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateStats(): void {
    this.stats = this.guestLimitsService.getCurrentStats();
  }

  redirectToSignup(): void {
    this.router.navigate(['/auth/register']);
  }
}