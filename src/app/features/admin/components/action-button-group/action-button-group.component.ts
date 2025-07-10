// ===============================================
// ⚡ ACTION BUTTON GROUP COMPONENT - TYPESCRIPT
// ===============================================

import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

export interface ActionButton {
  label: string;
  icon:
    | 'users'
    | 'moderation'
    | 'languages'
    | 'communities'
    | 'settings'
    | 'reports'
    | 'history'
    | 'add';
  route: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  disabled?: boolean;
  badge?: {
    value: number;
    color: 'primary' | 'warning' | 'danger' | 'success';
  };
}

export interface ActionGroup {
  title: string;
  actions: ActionButton[];
}

@Component({
  selector: 'app-action-button-group',
  standalone: false,
  template: `
    <!-- ⚡ ACTION BUTTON GROUP TEMPLATE -->
    <div class="action-button-groups">
      <div *ngFor="let group of groups" class="action-group">
        <!-- Titre du groupe -->
        <h4 class="group-title">{{ group.title }}</h4>

        <!-- Boutons d'action -->
        <div class="action-buttons">
          <button
            *ngFor="let action of group.actions"
            class="action-btn"
            [ngClass]="action.variant"
            [disabled]="action.disabled"
            (click)="navigateTo(action.route)"
            [attr.aria-label]="
              action.label +
              (action.badge ? ' (' + action.badge.value + ' en attente)' : '')
            "
            [title]="action.label"
          >
            <!-- Icône du bouton -->
            <div class="btn-icon">
              <!-- Icône Users -->
              <svg
                *ngIf="action.icon === 'users'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 00-3-3.87"></path>
                <path d="M16 3.13a4 4 0 010 7.75"></path>
              </svg>

              <!-- Icône Moderation -->
              <svg
                *ngIf="action.icon === 'moderation'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>

              <!-- Icône Languages -->
              <svg
                *ngIf="action.icon === 'languages'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  d="M5 8l6 6m-7 0l6.5-6.5m.5 10.5V7a2 2 0 012-2h4a2 2 0 012 2v11m-6 0V9"
                ></path>
              </svg>

              <!-- Icône Communities -->
              <svg
                *ngIf="action.icon === 'communities'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                <path d="M16 3.13a4 4 0 010 7.75"></path>
              </svg>

              <!-- Icône Settings -->
              <svg
                *ngIf="action.icon === 'settings'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path
                  d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-7a4 4 0 00-8 0m8 14a4 4 0 00-8 0"
                ></path>
              </svg>

              <!-- Icône Reports -->
              <svg
                *ngIf="action.icon === 'reports'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                ></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
              </svg>

              <!-- Icône History -->
              <svg
                *ngIf="action.icon === 'history'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12,6 12,12 16,14"></polyline>
              </svg>

              <!-- Icône Add -->
              <svg
                *ngIf="action.icon === 'add'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>

            <!-- Label du bouton -->
            <span class="btn-label">{{ action.label }}</span>

            <!-- Badge optionnel -->
            <span
              *ngIf="action.badge"
              class="btn-badge"
              [ngClass]="action.badge.color"
              [attr.aria-label]="action.badge.value + ' éléments en attente'"
            >
              {{ action.badge.value }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* ⚡ ACTION BUTTON GROUP STYLES */
      .action-button-groups {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .action-group {
        .group-title {
          color: var(--admin-text-primary);
          font-size: 1rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.2s ease;
        text-align: left;
        width: 100%;
        border: 1px solid var(--admin-border-primary);
        background: var(--admin-bg-secondary);
        color: var(--admin-text-secondary);
        cursor: pointer;
        position: relative;

        &:hover:not(:disabled) {
          background: var(--admin-bg-card);
          color: var(--admin-text-primary);
          border-color: var(--admin-primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          color: var(--admin-text-muted);

          &:hover {
            transform: none;
            box-shadow: none;
          }
        }

        /* Variantes de couleur */
        &.primary {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.3);

          &:hover:not(:disabled) {
            background: rgba(59, 130, 246, 0.2);
            color: #93c5fd;
            border-color: #60a5fa;
          }
        }

        &.secondary {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.3);

          &:hover:not(:disabled) {
            background: rgba(16, 185, 129, 0.2);
            color: #6ee7b7;
            border-color: #34d399;
          }
        }

        &.success {
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
          border-color: rgba(34, 197, 94, 0.3);

          &:hover:not(:disabled) {
            background: rgba(34, 197, 94, 0.2);
            color: #86efac;
            border-color: #4ade80;
          }
        }

        &.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.3);

          &:hover:not(:disabled) {
            background: rgba(245, 158, 11, 0.2);
            color: #fcd34d;
            border-color: #fbbf24;
          }
        }

        &.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);

          &:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            border-color: #f87171;
          }
        }

        &.ghost {
          background: transparent;
          color: var(--admin-text-muted);
          border: 1px dashed var(--admin-border-primary);

          &:hover:not(:disabled) {
            background: var(--admin-bg-secondary);
            color: var(--admin-text-secondary);
            border-style: solid;
          }
        }
      }

      .btn-icon {
        color: inherit;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-label {
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .btn-badge {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
        min-width: 1.5rem;
        text-align: center;
        flex-shrink: 0;

        &.primary {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        &.warning {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        &.danger {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        &.success {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .action-button-groups {
          gap: 1.5rem;
        }

        .action-group {
          .group-title {
            font-size: 0.875rem;
            margin-bottom: 0.75rem;
          }

          .action-buttons {
            gap: 0.5rem;
          }
        }

        .action-btn {
          padding: 0.875rem;
          font-size: 0.8rem;

          .btn-label {
            white-space: normal;
            overflow: visible;
            text-overflow: initial;
          }
        }
      }

      @media (max-width: 480px) {
        .action-btn {
          flex-direction: column;
          gap: 0.5rem;
          text-align: center;

          .btn-badge {
            position: absolute;
            top: -0.25rem;
            right: -0.25rem;
            min-width: 1.25rem;
            height: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }

      /* Utilitaires */
      .w-5 {
        width: 1.25rem;
      }
      .h-5 {
        height: 1.25rem;
      }
    `,
  ],
})
export class ActionButtonGroupComponent {
  @Input() groups: ActionGroup[] = [];

  constructor(private router: Router) {}

  navigateTo(route: string): void {
    if (route && !route.includes('disabled')) {
      this.router.navigate([route]);
    }
  }
}
