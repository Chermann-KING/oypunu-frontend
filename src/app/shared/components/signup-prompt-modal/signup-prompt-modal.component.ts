import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup-prompt-modal',
  standalone: false,
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-75" (click)="close()"></div>
      
      <!-- Modal Content -->
      <div class="relative bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
        <!-- Close Button -->
        <button 
          (click)="close()" 
          class="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <!-- Content -->
        <div class="text-center">
          <!-- Icon -->
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-red-500 mb-6">
            <span class="text-2xl">🚀</span>
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold text-white mb-4">
            {{title}}
          </h3>

          <!-- Message -->
          <p class="text-gray-300 mb-6 leading-relaxed">
            {{message}}
          </p>

          <!-- Stats -->
          <div *ngIf="showStats" class="bg-gray-800 rounded-lg p-4 mb-6">
            <div class="text-sm text-gray-400 mb-2">Vos consultations aujourd'hui :</div>
            <div class="flex justify-center space-x-6">
              <div class="text-center">
                <div class="text-lg font-bold text-orange-400">{{wordsViewed}}/{{maxWords}}</div>
                <div class="text-xs text-gray-500">Mots</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-purple-400">{{communitiesViewed}}/{{maxCommunities}}</div>
                <div class="text-xs text-gray-500">Communautés</div>
              </div>
            </div>
          </div>

          <!-- Benefits -->
          <div class="text-left mb-6">
            <div class="text-sm font-semibold text-gray-200 mb-3">Avec un compte gratuit :</div>
            <ul class="space-y-2 text-sm text-gray-300">
              <li class="flex items-center">
                <span class="text-green-400 mr-2">✓</span>
                Consultation illimitée de mots
              </li>
              <li class="flex items-center">
                <span class="text-green-400 mr-2">✓</span>
                Accès complet aux communautés
              </li>
              <li class="flex items-center">
                <span class="text-green-400 mr-2">✓</span>
                Sauvegarde de mots favoris
              </li>
              <li class="flex items-center">
                <span class="text-green-400 mr-2">✓</span>
                Recommandations personnalisées
              </li>
            </ul>
          </div>

          <!-- Actions -->
          <div class="flex flex-col space-y-3">
            <button 
              (click)="signup()"
              class="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105">
              Créer un compte gratuit
            </button>
            
            <button 
              (click)="login()"
              class="w-full bg-gray-700 text-gray-200 py-2 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors">
              J'ai déjà un compte
            </button>
            
            <button 
              (click)="close()"
              class="text-gray-400 text-sm hover:text-gray-300 transition-colors">
              Continuer sans inscription
            </button>
          </div>
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
export class SignupPromptModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Limite atteinte !';
  @Input() message = 'Vous avez atteint votre limite de consultations gratuite pour aujourd\'hui.';
  @Input() showStats = true;
  @Input() wordsViewed = 0;
  @Input() maxWords = 3;
  @Input() communitiesViewed = 0;
  @Input() maxCommunities = 2;

  @Output() closed = new EventEmitter<void>();

  constructor(private router: Router) {}

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  signup(): void {
    this.close();
    this.router.navigate(['/auth/register']);
  }

  login(): void {
    this.close();
    this.router.navigate(['/auth/login']);
  }
}