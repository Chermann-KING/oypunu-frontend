import { Component, Input } from '@angular/core';

export interface SystemStatusData {
  uptime: string;
  nodeVersion: string;
  memoryUsage: number; // en MB
  status: 'healthy' | 'warning' | 'error';
  lastCheck: Date;
}

@Component({
  selector: 'app-system-status',
  standalone: false,
  template: `
    <div class="system-status-card admin-card" [attr.data-status]="data.status">
      <div class="status-header">
        <div class="status-indicator">
          <div class="status-dot" [attr.data-status]="data.status"></div>
          <span class="status-title">Système</span>
        </div>
        <div class="last-check">
          <svg class="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12,6 12,12 16,14"></polyline>
          </svg>
          <span>{{ formatTime(data.lastCheck) }}</span>
        </div>
      </div>

      <div class="status-metrics">
        <div class="metric-row">
          <span class="metric-label">Uptime</span>
          <span class="metric-value">{{ data.uptime }}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Node.js</span>
          <span class="metric-value">{{ data.nodeVersion }}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Mémoire</span>
          <span class="metric-value">{{ data.memoryUsage }} MB</span>
        </div>
      </div>

      <div class="status-footer">
        <button class="refresh-btn" (click)="onRefresh()">
          <svg class="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Actualiser
        </button>
      </div>
    </div>
  `,
  styles: [`
    .system-status-card {
      --accent-color: var(--admin-info);
      background: linear-gradient(135deg, 
        rgba(31, 41, 55, 0.4) 0%, 
        rgba(17, 24, 39, 0.4) 100%
      );
      border-color: rgba(75, 85, 99, 0.2);
      padding: 1rem;
      min-height: auto;
      
      &[data-status="healthy"] {
        --accent-color: var(--admin-secondary);
      }
      
      &[data-status="warning"] {
        --accent-color: var(--admin-warning);
      }
      
      &[data-status="error"] {
        --accent-color: var(--admin-danger);
      }
    }

    .status-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
          
          &[data-status="healthy"] {
            background: var(--admin-secondary);
          }
          
          &[data-status="warning"] {
            background: var(--admin-warning);
          }
          
          &[data-status="error"] {
            background: var(--admin-danger);
          }
        }
        
        .status-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
        }
      }
      
      .last-check {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: var(--admin-text-muted);
        
        .clock-icon {
          width: 12px;
          height: 12px;
        }
      }
    }

    .status-metrics {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      
      .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .metric-label {
          font-size: 0.75rem;
          color: var(--admin-text-muted);
        }
        
        .metric-value {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
        }
      }
    }

    .status-footer {
      display: flex;
      justify-content: center;
      
      .refresh-btn {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.375rem 0.75rem;
        background: transparent;
        border: 1px solid var(--admin-border-primary);
        border-radius: 6px;
        color: var(--admin-text-muted);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background: rgba(31, 41, 55, 0.5);
          color: var(--admin-text-secondary);
          border-color: rgba(75, 85, 99, 0.5);
        }
        
        .refresh-icon {
          width: 12px;
          height: 12px;
        }
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    // Responsive
    @media (max-width: 768px) {
      .status-header {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }
    }
  `]
})
export class SystemStatusComponent {
  @Input() data!: SystemStatusData;

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  onRefresh(): void {
    // Logique de rafraîchissement
    console.log('Rafraîchissement des métriques système');
  }
}