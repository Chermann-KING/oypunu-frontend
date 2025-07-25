import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexGrid,
  ApexFill,
  ApexLegend,
  ApexPlotOptions,
  ApexResponsive,
} from 'ng-apexcharts';

export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'pie'
  | 'donut'
  | 'radialBar'
  | 'scatter'
  | 'heatmap';

export interface ChartData {
  name?: string;
  data?: number[];
  x?: string | number;
  y?: number;
  value?: number;
  label?: string;
  color?: string;
}

export interface ChartOptions {
  series: ApexAxisChartSeries | any[];
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  fill: ApexFill;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
  colors: string[];
  labels: string[];
}

@Component({
  selector: 'app-chart-widget',
  standalone: false,
  template: `
    <div
      class="chart-widget bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
    >
      <!-- Header -->
      <div class="chart-header px-6 py-4 border-b border-gray-700 bg-gray-800">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">{{ title }}</h3>
            <p *ngIf="subtitle" class="text-sm text-gray-300 mt-1">
              {{ subtitle }}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <!-- Indicateur de statut -->
            <div
              *ngIf="loading"
              class="flex items-center space-x-2 text-gray-300"
            >
              <div
                class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
              ></div>
              <span class="text-sm">Chargement...</span>
            </div>

            <!-- Actions -->
            <div *ngIf="!loading && !error" class="flex space-x-1">
              <button
                *ngIf="showRefresh"
                (click)="refreshData()"
                class="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Actualiser"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
              </button>

              <button
                *ngIf="showFullscreen"
                (click)="toggleFullscreen()"
                class="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="Plein écran"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Métriques rapides -->
        <div
          *ngIf="quickStats && quickStats.length > 0"
          class="flex space-x-6 mt-3"
        >
          <div
            *ngFor="let stat of quickStats"
            class="flex items-center space-x-2"
          >
            <div
              [class]="'w-2 h-2 rounded-full ' + (stat.color || 'bg-blue-400')"
            ></div>
            <span class="text-sm text-gray-300">{{ stat.label }}:</span>
            <span
              [class]="
                'text-sm font-medium ' +
                (stat.color ? getTextColor(stat.color) : 'text-blue-400')
              "
            >
              {{ stat.value }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contenu du graphique -->
      <div class="chart-content p-6">
        <!-- État d'erreur -->
        <div *ngIf="error" class="text-center py-8">
          <div
            class="inline-flex items-center justify-center w-12 h-12 bg-red-900 rounded-full mb-4"
          >
            <svg
              class="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
              ></path>
            </svg>
          </div>
          <h4 class="text-lg font-medium text-white mb-2">
            Erreur de chargement
          </h4>
          <p class="text-gray-300 mb-4">{{ error }}</p>
          <button
            (click)="refreshData()"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>

        <!-- État vide -->
        <div *ngIf="!loading && !error && isEmpty" class="no-data-container">
          <div class="no-data-icon">
            <svg
              class="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              ></path>
            </svg>
          </div>
          <h4 class="no-data-title">Aucune donnée</h4>
          <p class="no-data-subtitle">
            {{ emptyMessage || 'Aucune donnée disponible pour cette période' }}
          </p>
        </div>

        <!-- Graphique -->
        <div
          *ngIf="!loading && !error && !isEmpty"
          [class.h-80]="!isFullscreen"
          [class.h-96]="isFullscreen"
        >
          <apx-chart
            [series]="chartOptions.series"
            [chart]="chartOptions.chart"
            [xaxis]="chartOptions.xaxis"
            [yaxis]="chartOptions.yaxis"
            [dataLabels]="chartOptions.dataLabels"
            [grid]="chartOptions.grid"
            [stroke]="chartOptions.stroke"
            [tooltip]="chartOptions.tooltip"
            [fill]="chartOptions.fill"
            [legend]="chartOptions.legend"
            [plotOptions]="chartOptions.plotOptions"
            [responsive]="chartOptions.responsive"
            [colors]="chartOptions.colors"
            [labels]="chartOptions.labels"
          >
          </apx-chart>
        </div>
      </div>

      <!-- Footer avec actions -->
      <div
        *ngIf="showFooter && !loading && !error"
        class="chart-footer px-6 py-3 border-t border-gray-700 bg-gray-800"
      >
        <div class="flex items-center justify-between text-sm text-gray-300">
          <span>Dernière mise à jour: {{ lastUpdated | date : 'short' }}</span>
          <div class="flex space-x-4">
            <button
              *ngIf="showExport"
              (click)="exportData()"
              class="hover:text-white transition-colors"
            >
              Exporter
            </button>
            <button
              *ngIf="showDetails"
              (click)="showDetailedView()"
              class="hover:text-white transition-colors"
            >
              Voir détails
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chart-widget {
        transition: all 0.3s ease;
      }

      .chart-widget:hover {
        border-color: #6366f1;
      }

      .animate-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .no-data-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        padding: 2rem;
        color: #9ca3af;
        text-align: center;
      }

      .no-data-icon {
        width: 3rem;
        height: 3rem;
        color: #6b7280;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .no-data-title {
        color: #f3f4f6 !important;
        font-weight: 600;
        font-size: 1.125rem;
        margin-bottom: 0.5rem;
      }

      .no-data-subtitle {
        color: #9ca3af !important;
        font-size: 0.875rem;
        line-height: 1.4;
      }
    `,
  ],
})
export class ChartWidgetComponent implements OnInit, OnChanges {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() type: ChartType = 'line';
  @Input() data: ChartData[] = [];
  @Input() categories: string[] = [];
  @Input() height: number = 320;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  @Input() emptyMessage?: string;
  @Input() showRefresh: boolean = true;
  @Input() showFullscreen: boolean = true;
  @Input() showFooter: boolean = true;
  @Input() showExport: boolean = true;
  @Input() showDetails: boolean = false;
  @Input() quickStats: {
    label: string;
    value: string | number;
    color?: string;
  }[] = [];
  @Input() colors: string[] = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
  ];
  @Input() customOptions: Partial<ChartOptions> = {};

  chartOptions: ChartOptions = {} as ChartOptions;
  isFullscreen: boolean = false;
  lastUpdated: Date = new Date();

  ngOnInit() {
    this.setupChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['type'] || changes['categories']) {
      this.setupChart();
      this.lastUpdated = new Date();
    }
  }

  get isEmpty(): boolean {
    return !this.data || this.data.length === 0;
  }

  private setupChart() {
    const baseOptions: ChartOptions = {
      series: this.prepareSeries(),
      chart: {
        type: this.type,
        height: this.height,
        background: 'transparent',
        foreColor: '#E5E7EB', // Couleur optimisée pour thème sombre (gray-200)
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        animations: {
          enabled: true,
          speed: 800,
        },
      },
      xaxis: {
        categories: this.categories,
        labels: {
          style: {
            colors: '#D1D5DB', // Contraste amélioré (gray-300)
          },
        },
        axisBorder: {
          color: '#6B7280', // Bordure visible (gray-500)
        },
        axisTicks: {
          color: '#6B7280', // Ticks visibles (gray-500)
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#D1D5DB', // Contraste amélioré (gray-300)
          },
        },
      },
      grid: {
        borderColor: '#4B5563', // Grille plus visible (gray-600)
        strokeDashArray: 3,
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      tooltip: {
        theme: 'dark',
        style: {
          fontSize: '12px',
        },
        x: {
          show: true,
        },
        y: {
          formatter: function (val: number) {
            return val.toString();
          },
        },
      },
      legend: {
        labels: {
          colors: '#E5E7EB', // Légende lisible (gray-200)
        },
        position: 'top',
        horizontalAlign: 'left',
      },
      fill: {
        opacity: 1,
      },
      plotOptions: {},
      colors: this.colors,
      labels: this.categories,
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 250,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
    };

    // Configurations spécifiques par type de graphique
    switch (this.type) {
      case 'pie':
      case 'donut':
        baseOptions.labels = this.categories;
        baseOptions.plotOptions = {
          pie: {
            donut: {
              size: this.type === 'donut' ? '70%' : '0%',
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#E5E7EB',
                },
                value: {
                  show: true,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#F3F4F6',
                },
                total: {
                  show: true,
                  showAlways: false,
                  label: 'Total',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#E5E7EB',
                },
              },
            },
          },
        };
        break;

      case 'bar':
        baseOptions.plotOptions = {
          bar: {
            borderRadius: 4,
            horizontal: false,
            columnWidth: '70%',
          },
        };
        break;

      case 'area':
        baseOptions.fill = {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0.1,
            stops: [0, 90, 100],
          },
        };
        break;
    }

    // Fusionner avec les options personnalisées
    this.chartOptions = this.mergeDeep(baseOptions, this.customOptions);
  }

  private prepareSeries(): any[] {
    if (!this.data || this.data.length === 0) {
      return [];
    }

    switch (this.type) {
      case 'pie':
      case 'donut':
        return this.data.map((item) => item.value || item.y || 0);

      case 'heatmap':
        return this.data.map((item) => ({
          name: item.name || '',
          data: item.data || [],
        }));

      default:
        // Pour les graphiques linéaires, aires, barres, etc.
        if (this.data[0] && 'data' in this.data[0]) {
          return this.data.map((item) => ({
            name: item.name || '',
            data: item.data || [],
          }));
        } else {
          return [
            {
              name: 'Données',
              data: this.data.map((item) => item.y || item.value || 0),
            },
          ];
        }
    }
  }

  refreshData() {
    this.lastUpdated = new Date();
    // Émettre un événement pour permettre au parent de recharger les données
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    // Redimensionner le graphique après le changement
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  exportData() {
    const dataToExport = {
      title: this.title,
      data: this.data,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.title
      .toLowerCase()
      .replace(/\s+/g, '-')}-data.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  showDetailedView() {
    // Implémenter la vue détaillée si nécessaire
    console.log('Affichage des détails pour:', this.title);
  }

  getTextColor(bgColor: string): string {
    // Convertir la couleur en classe de texte appropriée pour thème sombre
    const colorMap: { [key: string]: string } = {
      'bg-blue-400': 'text-blue-400',
      'bg-green-400': 'text-green-400',
      'bg-yellow-400': 'text-yellow-400',
      'bg-red-400': 'text-red-400',
      'bg-purple-400': 'text-purple-400',
      'bg-indigo-400': 'text-indigo-400',
      'bg-cyan-400': 'text-cyan-400',
      'bg-orange-400': 'text-orange-400',
    };

    return colorMap[bgColor] || 'text-gray-300'; // Fallback lisible sur fond sombre
  }

  private mergeDeep(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
