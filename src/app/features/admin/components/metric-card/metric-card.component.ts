// ===============================================
// 📊 METRIC CARD COMPONENT - TYPESCRIPT
// ===============================================

import { Component, Input } from '@angular/core';

export interface MetricData {
  value: number;
  label: string;
  sublabel: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: 'users' | 'words' | 'communities' | 'messages' | 'settings' | 'reports';
  color: 'primary' | 'secondary' | 'info' | 'warning' | 'danger' | 'success';
  loading?: boolean;
}

@Component({
  selector: 'app-metric-card',
  standalone: false,
  template: `
    <!-- 📊 METRIC CARD TEMPLATE -->
    <div class="metric-card" [class.loading]="data?.loading">
      <!-- Header avec icône, valeur et label -->
      <div class="metric-header">
        <div class="metric-icon-container">
          <div class="metric-icon" [ngClass]="data?.color">
            <!-- Icône Users -->
            <svg
              *ngIf="data?.icon === 'users'"
              class="w-6 h-6"
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

            <!-- Icône Words -->
            <svg
              *ngIf="data?.icon === 'words'"
              class="w-6 h-6"
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

            <!-- Icône Communities -->
            <svg
              *ngIf="data?.icon === 'communities'"
              class="w-6 h-6"
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

            <!-- Icône Messages -->
            <svg
              *ngIf="data?.icon === 'messages'"
              class="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              ></path>
            </svg>

            <!-- Spinner de chargement -->
            <div *ngIf="data?.loading" class="loading-spinner">
              <div class="spinner-ring"></div>
            </div>
          </div>
        </div>

        <div class="metric-info">
          <div class="metric-value" [class.loading-text]="data?.loading">
            {{ data?.loading ? '...' : (data?.value | number) }}
          </div>
          <div class="metric-label">
            {{ data?.label }}
          </div>
        </div>
      </div>

      <!-- Détails avec sous-label et changement -->
      <div class="metric-details">
        <div class="metric-sublabel">
          {{ data?.sublabel }}
        </div>

        <div
          *ngIf="data?.change && !data?.loading"
          class="metric-change"
          [ngClass]="data?.change?.type"
        >
          <div class="change-indicator">
            <!-- Flèche augmentation -->
            <svg
              *ngIf="data?.change?.type === 'increase'"
              class="change-icon w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"></polyline>
              <polyline points="17,6 23,6 23,12"></polyline>
            </svg>

            <!-- Flèche diminution -->
            <svg
              *ngIf="data?.change?.type === 'decrease'"
              class="change-icon w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <polyline points="23,18 13.5,8.5 8.5,13.5 1,6"></polyline>
              <polyline points="17,18 23,18 23,12"></polyline>
            </svg>

            <!-- Trait neutre -->
            <svg
              *ngIf="data?.change?.type === 'neutral'"
              class="change-icon w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>

            <span class="change-value"> {{ data?.change?.value }}% </span>
          </div>
          <span class="change-period">{{ data?.change?.period }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* 📊 METRIC CARD STYLES - ARRIÈRE-PLAN VISIBLE FORCÉ */
      .metric-card {
        background: #1f2937 !important; /* Gray-800 - FOND VISIBLE */
        border: 1px solid #374151 !important; /* Gray-700 - BORDURE VISIBLE */
        border-radius: 16px;
        padding: 1.5rem;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);

        &:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25) !important;
          border-color: #60a5fa !important; /* Blue-400 */
          transform: translateY(-2px);
        }

        &.loading {
          opacity: 0.8;
        }
      }

      .metric-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .metric-icon-container {
        position: relative;
      }

      .metric-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;

        /* Couleurs par type */
        &.primary {
          background: rgba(59, 130, 246, 0.2) !important;
          color: #60a5fa !important;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        &.secondary {
          background: rgba(16, 185, 129, 0.2) !important;
          color: #34d399 !important;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        &.info {
          background: rgba(6, 182, 212, 0.2) !important;
          color: #22d3ee !important;
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        &.warning {
          background: rgba(245, 158, 11, 0.2) !important;
          color: #fbbf24 !important;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        &.danger {
          background: rgba(239, 68, 68, 0.2) !important;
          color: #f87171 !important;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        &.success {
          background: rgba(34, 197, 94, 0.2) !important;
          color: #4ade80 !important;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
      }

      .loading-spinner {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(30, 41, 59, 0.8);
        border-radius: 12px;

        .spinner-ring {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top: 2px solid #60a5fa;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }

      .metric-info {
        flex: 1;
        min-width: 0;
      }

      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff !important;
        line-height: 1.2;
        margin-bottom: 0.25rem;

        &.loading-text {
          color: #9ca3af !important;
          animation: pulse 1.5s ease-in-out infinite;
        }
      }

      .metric-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #f1f5f9 !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .metric-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 1rem;
        border-top: 1px solid #374151 !important; /* Gray-700 */
      }

      .metric-sublabel {
        font-size: 0.875rem;
        color: #cbd5e1 !important;
        font-weight: 500;
      }

      .metric-change {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;

        .change-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .change-period {
          font-size: 0.75rem;
          color: #9ca3af !important;
          font-weight: 400;
        }

        /* Types de changement */
        &.increase {
          .change-indicator {
            color: #4ade80 !important; /* Green-400 */
          }
        }

        &.decrease {
          .change-indicator {
            color: #f87171 !important; /* Red-400 */
          }
        }

        &.neutral {
          .change-indicator {
            color: #9ca3af !important;
          }
        }
      }

      .change-icon {
        flex-shrink: 0;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .metric-card {
          padding: 1rem;
        }

        .metric-value {
          font-size: 1.75rem;
        }

        .metric-details {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .metric-change {
          align-items: flex-start;
        }
      }

      /* Animations */
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* Utilitaires */
      .w-4 {
        width: 1rem;
      }
      .w-6 {
        width: 1.5rem;
      }
      .h-4 {
        height: 1rem;
      }
      .h-6 {
        height: 1.5rem;
      }
    `,
  ],
})
export class MetricCardComponent {
  @Input() data: MetricData | null = null;
}
