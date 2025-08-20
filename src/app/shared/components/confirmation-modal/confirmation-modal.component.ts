import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  showInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: false,
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      *ngIf="isVisible"
    >
      <div
        class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700"
      >
        <!-- Header -->
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <svg
              class="w-6 h-6"
              [ngClass]="getIconClass()"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                [attr.d]="getIconPath()"
              />
            </svg>
          </div>
          <h3 class="ml-3 text-lg font-medium text-white">
            {{ config.title }}
          </h3>
        </div>

        <!-- Message -->
        <div class="mb-6">
          <p class="text-sm text-gray-300">{{ config.message }}</p>
        </div>

        <!-- Input optionnel -->
        <div class="mb-6" *ngIf="config.showInput">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            {{ config.inputLabel }}
          </label>
          <input
            type="text"
            [(ngModel)]="inputValue"
            [placeholder]="config.inputPlaceholder || ''"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            (click)="onCancel()"
            class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {{ config.cancelText || 'Annuler' }}
          </button>
          <button
            type="button"
            (click)="onConfirm()"
            class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2"
            [ngClass]="getConfirmButtonClass()"
          >
            {{ config.confirmText || 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmationModalComponent {
  @Input() isVisible = false;
  @Input() config: ConfirmationConfig = {
    title: 'Confirmation',
    message: 'Êtes-vous sûr de vouloir effectuer cette action ?',
  };
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  inputValue = '';

  getIconClass(): string {
    switch (this.config.type) {
      case 'danger':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-blue-400';
    }
  }

  getIconPath(): string {
    switch (this.config.type) {
      case 'danger':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z';
      case 'warning':
        return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.config.type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  }

  onConfirm(): void {
    this.confirmed.emit(this.inputValue);
    this.inputValue = '';
  }

  onCancel(): void {
    this.cancelled.emit();
    this.inputValue = '';
  }
}
