import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: false,
  template: `
    <div class="fixed top-20 right-4 z-[9999] space-y-3 max-w-sm w-full">
      <div *ngFor="let toast of toasts; trackBy: trackToast" 
           class="toast-item transform transition-all duration-500 ease-out"
           [class.opacity-0]="toast.removing"
           [class.translate-x-full]="toast.removing"
           [class.scale-95]="toast.removing">
        
        <div class="relative rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm border"
             [ngClass]="getToastClasses(toast.type)">
          
          <!-- Barre de progression colorée -->
          <div class="absolute top-0 left-0 h-1 w-full"
               [ngClass]="getProgressBarClasses(toast.type)"></div>
          
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0 mt-0.5">
                <div class="flex items-center justify-center w-8 h-8 rounded-full"
                     [ngClass]="getIconBackgroundClasses(toast.type)">
                  <span class="text-sm">{{ getToastIcon(toast.type) }}</span>
                </div>
              </div>
              <div class="ml-3 flex-1">
                <h4 class="text-sm font-semibold" [ngClass]="getTitleClasses(toast.type)">
                  {{ toast.title }}
                </h4>
                <p class="mt-1 text-sm leading-relaxed" [ngClass]="getMessageClasses(toast.type)">
                  {{ toast.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0">
                <button 
                  (click)="removeToast(toast.id)"
                  class="rounded-full p-1 transition-colors duration-200 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  [ngClass]="getCloseButtonClasses(toast.type)">
                  <span class="sr-only">Fermer</span>
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-item {
      animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(100%) scale(0.8);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }
    
    /* Améliorer la lisibilité sur fond sombre */
    .toast-item .backdrop-blur-sm {
      backdrop-filter: blur(8px);
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: (Toast & { removing?: boolean })[] = [];
  private destroy$ = new Subject<void>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        this.toasts = toasts.map(toast => ({ ...toast }));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeToast(id: string): void {
    // Animation de sortie
    const toast = this.toasts.find(t => t.id === id);
    if (toast) {
      toast.removing = true;
      setTimeout(() => {
        this.toastService.dismiss(id);
      }, 500);
    }
  }

  trackToast(index: number, toast: Toast): string {
    return toast.id;
  }

  getToastClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-gray-900/95 border-green-500/50 text-white';
      case 'error':
        return 'bg-gray-900/95 border-red-500/50 text-white';
      case 'warning':
        return 'bg-gray-900/95 border-yellow-500/50 text-white';
      case 'info':
        return 'bg-gray-900/95 border-blue-500/50 text-white';
      default:
        return 'bg-gray-900/95 border-gray-500/50 text-white';
    }
  }

  getTitleClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-300';
      case 'error':
        return 'text-red-300';
      case 'warning':
        return 'text-yellow-300';
      case 'info':
        return 'text-blue-300';
      default:
        return 'text-gray-300';
    }
  }

  getMessageClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-100';
      case 'error':
        return 'text-red-100';
      case 'warning':
        return 'text-yellow-100';
      case 'info':
        return 'text-blue-100';
      default:
        return 'text-gray-100';
    }
  }

  getCloseButtonClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-400 hover:text-green-300 focus:ring-green-500';
      case 'error':
        return 'text-red-400 hover:text-red-300 focus:ring-red-500';
      case 'warning':
        return 'text-yellow-400 hover:text-yellow-300 focus:ring-yellow-500';
      case 'info':
        return 'text-blue-400 hover:text-blue-300 focus:ring-blue-500';
      default:
        return 'text-gray-400 hover:text-gray-300 focus:ring-gray-500';
    }
  }

  getProgressBarClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-400';
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-400';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-blue-400';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-400';
    }
  }

  getIconBackgroundClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'info':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  }
}