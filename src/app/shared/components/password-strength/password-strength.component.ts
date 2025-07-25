import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-2" *ngIf="password && password.length > 0">
      <div class="flex items-center space-x-2">
        <div class="flex-1">
          <div class="flex space-x-1">
            <div
              class="h-2 flex-1 rounded-full transition-all duration-300"
              [ngClass]="getBarColor(0)"
            ></div>
            <div
              class="h-2 flex-1 rounded-full transition-all duration-300"
              [ngClass]="getBarColor(1)"
            ></div>
            <div
              class="h-2 flex-1 rounded-full transition-all duration-300"
              [ngClass]="getBarColor(2)"
            ></div>
            <div
              class="h-2 flex-1 rounded-full transition-all duration-300"
              [ngClass]="getBarColor(3)"
            ></div>
          </div>
        </div>
        <span class="text-sm font-medium" [ngClass]="strengthColor">
          {{ strengthText }}
        </span>
      </div>

      <!-- Conseils d'amélioration -->
      <div class="mt-2 text-xs text-gray-400" *ngIf="suggestions.length > 0">
        <div class="flex flex-wrap gap-1">
          <span
            *ngFor="let suggestion of suggestions"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs"
            [ngClass]="
              suggestion.met
                ? 'bg-green-900 text-green-200'
                : 'bg-gray-800 text-gray-400'
            "
          >
            <span class="mr-1">{{ suggestion.met ? '✓' : '○' }}</span>
            {{ suggestion.text }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .bg-strength-weak {
        background-color: #dc2626;
      }
      .bg-strength-fair {
        background-color: #f59e0b;
      }
      .bg-strength-good {
        background-color: #10b981;
      }
      .bg-strength-strong {
        background-color: #059669;
      }
      .bg-strength-inactive {
        background-color: #374151;
      }
    `,
  ],
})
export class PasswordStrengthComponent implements OnInit, OnChanges {
  @Input() password: string = '';

  strengthScore: number = 0;
  strengthText: string = '';
  strengthColor: string = '';
  suggestions: Array<{ text: string; met: boolean }> = [];

  ngOnInit() {
    this.updateStrength();
  }

  ngOnChanges() {
    this.updateStrength();
  }

  private updateStrength() {
    if (!this.password || this.password.length === 0) {
      this.strengthScore = 0;
      this.strengthText = '';
      this.strengthColor = '';
      this.suggestions = [];
      return;
    }

    const checks = [
      { text: '8+ caractères', met: this.password.length >= 8 },
      { text: 'Majuscule', met: /[A-Z]/.test(this.password) },
      { text: 'Minuscule', met: /[a-z]/.test(this.password) },
      { text: 'Chiffre', met: /[0-9]/.test(this.password) },
      { text: 'Caractère spécial', met: /[^A-Za-z0-9]/.test(this.password) },
    ];

    this.suggestions = checks;
    this.strengthScore = checks.filter((check) => check.met).length;

    // Déterminer le niveau de force
    if (this.strengthScore <= 2) {
      this.strengthText = 'Faible';
      this.strengthColor = 'text-red-400';
    } else if (this.strengthScore === 3) {
      this.strengthText = 'Moyen';
      this.strengthColor = 'text-yellow-400';
    } else if (this.strengthScore === 4) {
      this.strengthText = 'Fort';
      this.strengthColor = 'text-green-400';
    } else {
      this.strengthText = 'Très fort';
      this.strengthColor = 'text-green-500';
    }
  }

  getBarColor(index: number): string {
    if (index >= this.strengthScore) {
      return 'bg-strength-inactive';
    }

    switch (this.strengthScore) {
      case 1:
      case 2:
        return 'bg-strength-weak';
      case 3:
        return 'bg-strength-fair';
      case 4:
        return 'bg-strength-good';
      case 5:
        return 'bg-strength-strong';
      default:
        return 'bg-strength-inactive';
    }
  }
}
