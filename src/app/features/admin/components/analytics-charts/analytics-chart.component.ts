/**
 * @fileoverview Composant présentationnel Analytics Chart - SOLID Principles
 *
 * Composant pur qui affiche différents types de graphiques analytiques.
 * Ne contient aucune logique métier, uniquement la présentation des données.
 *
 * @author Équipe O'Ypunu Frontend
 * @version 1.0.0
 * @since 2025-01-01
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

/**
 * Types de graphiques supportés
 */
export type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter';

/**
 * Interface pour les données d'un point de données
 */
export interface ChartDataPoint {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Interface pour une série de données
 */
export interface ChartDataSeries {
  readonly name: string;
  readonly data: ChartDataPoint[];
  readonly color?: string;
  readonly type?: ChartType;
}

/**
 * Interface pour la configuration du graphique
 */
export interface ChartConfig {
  readonly title?: string;
  readonly subtitle?: string;
  readonly type: ChartType;
  readonly height?: number;
  readonly width?: string;
  readonly showLegend?: boolean;
  readonly showGrid?: boolean;
  readonly showTooltips?: boolean;
  readonly animations?: boolean;
  readonly responsive?: boolean;
  readonly colors?: string[];
  readonly xAxisLabel?: string;
  readonly yAxisLabel?: string;
}

/**
 * Interface pour les actions du graphique
 */
export interface ChartAction {
  readonly type:
    | 'export'
    | 'refresh'
    | 'zoom'
    | 'reset'
    | 'toggle_data'
    | 'change_type'
    | 'drill_down'
    | 'period_change';
  readonly chartType?: string;
  readonly payload?: any;
}

/**
 * Interface principale pour les données de graphique
 */
export interface ChartData {
  readonly type: string;
  readonly data: any;
  readonly options: any;
  readonly metadata?: Record<string, any>;
}

/**
 * Interface pour les événements de clic sur les données
 */
export interface ChartDataClickEvent {
  readonly point: ChartDataPoint;
  readonly seriesIndex: number;
  readonly pointIndex: number;
}

/**
 * Composant AnalyticsChart - Single Responsibility Principle
 *
 * Responsabilité unique : Afficher des graphiques analytiques de manière interactive
 */
@Component({
  selector: 'app-analytics-chart',
  standalone: false,
  templateUrl: './analytics-chart.component.html',
  styleUrls: ['./analytics-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsChartComponent {
  // ===== INPUTS =====

  @Input() config: ChartConfig = { type: 'line' };
  @Input() dataSeries: ChartDataSeries[] = [];
  @Input() chartData: ChartData | null = null;
  @Input() chartType: string = 'line';
  @Input() title: string = '';
  @Input() period: string = '30d';
  @Input() isLoading: boolean = false;
  @Input() errorMessage: string | null = null;
  @Input() showTypeSelector: boolean = false;
  @Input() availableChartTypes: ChartType[] = ['line', 'bar', 'pie'];

  // ===== OUTPUTS =====

  @Output() actionClicked = new EventEmitter<ChartAction>();
  @Output() chartAction = new EventEmitter<ChartAction>();
  @Output() dataPointClicked = new EventEmitter<ChartDataClickEvent>();
  @Output() chartTypeChanged = new EventEmitter<ChartType>();

  // ===== PROPRIÉTÉS INTERNES =====

  public readonly svgWidth = 800;
  public readonly svgHeight = 400;
  public readonly chartMargin = { top: 20, right: 20, bottom: 40, left: 50 };

  public chartTypeSelectorOpen = false;
  public tooltip = {
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0,
  };

  private readonly defaultColors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#84cc16',
  ];

  // ===== MÉTHODES PUBLIQUES =====

  /**
   * Vérifie si le composant a des actions
   */
  public hasActions(): boolean {
    return this.showTypeSelector || true; // Toujours des actions par défaut (refresh, export)
  }

  /**
   * Vérifie si des données sont disponibles
   */
  public hasData(): boolean {
    return (
      this.dataSeries.length > 0 &&
      this.dataSeries.some((series) => series.data.length > 0)
    );
  }

  /**
   * Gestion des actions
   */
  public onAction(type: ChartAction['type'], payload?: any): void {
    this.actionClicked.emit({ type, payload });
  }

  /**
   * Gestion du clic sur un point de données
   */
  public onDataPointClick(
    point: ChartDataPoint,
    seriesIndex: number,
    pointIndex: number
  ): void {
    this.dataPointClicked.emit({ point, seriesIndex, pointIndex });
  }

  /**
   * Gestion du changement de type de graphique
   */
  public onChartTypeChange(type: ChartType): void {
    this.chartTypeSelectorOpen = false;
    this.chartTypeChanged.emit(type);
  }

  /**
   * Toggle du sélecteur de type de graphique
   */
  public toggleChartTypeSelector(): void {
    this.chartTypeSelectorOpen = !this.chartTypeSelectorOpen;
  }

  /**
   * Toggle de la visibilité d'une série
   */
  public toggleSeriesVisibility(seriesIndex: number): void {
    // À implémenter : masquer/afficher une série
    console.log('Toggle series visibility:', seriesIndex);
  }

  /**
   * Affichage du tooltip
   */
  public showTooltip(point: ChartDataPoint, event: MouseEvent): void {
    if (!this.config.showTooltips) return;

    this.tooltip = {
      visible: true,
      x: event.offsetX + 10,
      y: event.offsetY - 10,
      label: point.label,
      value: point.value,
    };
  }

  /**
   * Masquage du tooltip
   */
  public hideTooltip(): void {
    this.tooltip = { ...this.tooltip, visible: false };
  }

  /**
   * Formatage de la valeur du tooltip
   */
  public formatTooltipValue(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  /**
   * Obtient la couleur d'une série
   */
  public getSeriesColor(index: number): string {
    if (this.config.colors && this.config.colors[index]) {
      return this.config.colors[index];
    }
    return this.defaultColors[index % this.defaultColors.length];
  }

  /**
   * Obtient le libellé d'un type de graphique
   */
  public getChartTypeLabel(type: ChartType): string {
    const labels: Record<ChartType, string> = {
      line: 'Linéaire',
      bar: 'Barres',
      pie: 'Secteurs',
      doughnut: 'Anneau',
      area: 'Aires',
      scatter: 'Nuage',
    };
    return labels[type] || type;
  }

  /**
   * Obtient l'icône d'un type de graphique
   */
  public getChartTypeIcon(type: ChartType): string {
    const icons: Record<ChartType, string> = {
      line: 'icon-trending-up',
      bar: 'icon-bar-chart',
      pie: 'icon-pie-chart',
      doughnut: 'icon-pie-chart',
      area: 'icon-activity',
      scatter: 'icon-scatter-chart',
    };
    return icons[type] || 'icon-bar-chart';
  }

  // ===== MÉTHODES DE CALCUL POUR SVG =====

  /**
   * Calcule les lignes de grille
   */
  public getGridLines(): Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }> {
    const lines = [];
    const chartWidth =
      this.svgWidth - this.chartMargin.left - this.chartMargin.right;
    const chartHeight =
      this.svgHeight - this.chartMargin.top - this.chartMargin.bottom;

    // Lignes horizontales
    for (let i = 0; i <= 5; i++) {
      const y = this.chartMargin.top + (chartHeight * i) / 5;
      lines.push({
        x1: this.chartMargin.left,
        y1: y,
        x2: this.svgWidth - this.chartMargin.right,
        y2: y,
      });
    }

    // Lignes verticales
    if (this.hasData()) {
      const dataPoints = this.dataSeries[0].data.length;
      for (let i = 0; i <= dataPoints - 1; i++) {
        const x = this.chartMargin.left + (chartWidth * i) / (dataPoints - 1);
        lines.push({
          x1: x,
          y1: this.chartMargin.top,
          x2: x,
          y2: this.svgHeight - this.chartMargin.bottom,
        });
      }
    }

    return lines;
  }

  /**
   * Calcule les labels de l'axe X
   */
  public getXAxisLabels(): Array<{ x: number; y: number; text: string }> {
    if (!this.hasData()) return [];

    const labels = [];
    const chartWidth =
      this.svgWidth - this.chartMargin.left - this.chartMargin.right;
    const dataPoints = this.dataSeries[0].data;

    for (let i = 0; i < dataPoints.length; i++) {
      const x =
        this.chartMargin.left + (chartWidth * i) / (dataPoints.length - 1);
      labels.push({
        x,
        y: this.svgHeight - this.chartMargin.bottom + 20,
        text: dataPoints[i].label,
      });
    }

    return labels;
  }

  /**
   * Calcule les labels de l'axe Y
   */
  public getYAxisLabels(): Array<{ x: number; y: number; text: string }> {
    const labels = [];
    const chartHeight =
      this.svgHeight - this.chartMargin.top - this.chartMargin.bottom;
    const maxValue = this.getMaxDataValue();

    for (let i = 0; i <= 5; i++) {
      const y =
        this.svgHeight - this.chartMargin.bottom - (chartHeight * i) / 5;
      const value = (maxValue * i) / 5;
      labels.push({
        x: this.chartMargin.left - 10,
        y: y + 4,
        text: this.formatAxisValue(value),
      });
    }

    return labels;
  }

  /**
   * Calcule le chemin d'une ligne
   */
  public getLinePath(series: ChartDataSeries, seriesIndex: number): string {
    if (series.data.length === 0) return '';

    const chartWidth =
      this.svgWidth - this.chartMargin.left - this.chartMargin.right;
    const chartHeight =
      this.svgHeight - this.chartMargin.top - this.chartMargin.bottom;
    const maxValue = this.getMaxDataValue();

    let path = '';

    series.data.forEach((point, index) => {
      const x =
        this.chartMargin.left + (chartWidth * index) / (series.data.length - 1);
      const y =
        this.svgHeight -
        this.chartMargin.bottom -
        (chartHeight * point.value) / maxValue;

      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    if (this.config.type === 'area') {
      const lastX = this.chartMargin.left + chartWidth;
      const baseY = this.svgHeight - this.chartMargin.bottom;
      path += ` L ${lastX} ${baseY} L ${this.chartMargin.left} ${baseY} Z`;
    }

    return path;
  }

  /**
   * Calcule la position X d'un point
   */
  public getPointX(point: ChartDataPoint, index: number): number {
    const chartWidth =
      this.svgWidth - this.chartMargin.left - this.chartMargin.right;
    const dataLength = this.dataSeries[0]?.data.length || 1;
    return this.chartMargin.left + (chartWidth * index) / (dataLength - 1);
  }

  /**
   * Calcule la position Y d'un point
   */
  public getPointY(point: ChartDataPoint, seriesIndex: number): number {
    const chartHeight =
      this.svgHeight - this.chartMargin.top - this.chartMargin.bottom;
    const maxValue = this.getMaxDataValue();
    return (
      this.svgHeight -
      this.chartMargin.bottom -
      (chartHeight * point.value) / maxValue
    );
  }

  /**
   * Calcule la position X d'une barre
   */
  public getBarX(
    point: ChartDataPoint,
    pointIndex: number,
    seriesIndex: number
  ): number {
    const chartWidth =
      this.svgWidth - this.chartMargin.left - this.chartMargin.right;
    const dataLength = this.dataSeries[0]?.data.length || 1;
    const barGroupWidth = chartWidth / dataLength;
    const barWidth = this.getBarWidth();
    const seriesCount = this.dataSeries.length;

    const groupX = this.chartMargin.left + barGroupWidth * pointIndex;
    return (
      groupX +
      barWidth * seriesIndex +
      (barGroupWidth - barWidth * seriesCount) / 2
    );
  }

  /**
   * Calcule la position Y d'une barre
   */
  public getBarY(point: ChartDataPoint): number {
    const chartHeight =
      this.svgHeight - this.chartMargin.top - this.chartMargin.bottom;
    const maxValue = this.getMaxDataValue();
    return (
      this.svgHeight -
      this.chartMargin.bottom -
      (chartHeight * point.value) / maxValue
    );
  }

  /**
   * Calcule la largeur d'une barre
   */
  public getBarWidth(): number {
    const chartWidth =
      this.svgWidth - this.chartMargin.left - this.chartMargin.right;
    const dataLength = this.dataSeries[0]?.data.length || 1;
    const seriesCount = this.dataSeries.length;
    return (chartWidth / dataLength / seriesCount) * 0.8;
  }

  /**
   * Calcule la hauteur d'une barre
   */
  public getBarHeight(point: ChartDataPoint): number {
    const chartHeight =
      this.svgHeight - this.chartMargin.top - this.chartMargin.bottom;
    const maxValue = this.getMaxDataValue();
    return (chartHeight * point.value) / maxValue;
  }

  /**
   * Calcule les segments du graphique circulaire
   */
  public getPieSlices(): Array<{
    path: string;
    color: string;
    data: ChartDataPoint;
    percentage: number;
    labelX: number;
    labelY: number;
  }> {
    if (!this.hasData() || this.dataSeries.length === 0) return [];

    const data = this.dataSeries[0].data;
    const total = data.reduce((sum, point) => sum + point.value, 0);
    const radius = Math.min(this.svgWidth, this.svgHeight) / 2 - 40;
    const innerRadius = this.config.type === 'doughnut' ? radius * 0.5 : 0;

    let currentAngle = 0;
    const slices: {
      path: string;
      color: string;
      data: ChartDataPoint;
      percentage: number;
      labelX: number;
      labelY: number;
    }[] = [];

    data.forEach((point, index) => {
      const percentage = (point.value / total) * 100;
      const angle = (point.value / total) * 2 * Math.PI;

      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calcul du chemin SVG
      const x1 = Math.cos(startAngle) * radius;
      const y1 = Math.sin(startAngle) * radius;
      const x2 = Math.cos(endAngle) * radius;
      const y2 = Math.sin(endAngle) * radius;

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      let path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      if (innerRadius > 0) {
        const ix1 = Math.cos(startAngle) * innerRadius;
        const iy1 = Math.sin(startAngle) * innerRadius;
        const ix2 = Math.cos(endAngle) * innerRadius;
        const iy2 = Math.sin(endAngle) * innerRadius;

        path = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
      }

      // Position du label
      const labelRadius = (radius + innerRadius) / 2;
      const labelAngle = startAngle + angle / 2;
      const labelX = Math.cos(labelAngle) * labelRadius;
      const labelY = Math.sin(labelAngle) * labelRadius;

      slices.push({
        path,
        color: point.color || this.getSeriesColor(index),
        data: point,
        percentage: Math.round(percentage),
        labelX,
        labelY,
      });

      currentAngle = endAngle;
    });

    return slices;
  }

  // ===== MÉTHODES UTILITAIRES =====

  private getMaxDataValue(): number {
    let max = 0;
    for (const series of this.dataSeries) {
      for (const point of series.data) {
        if (point.value > max) {
          max = point.value;
        }
      }
    }
    return max || 1;
  }

  private formatAxisValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return Math.round(value).toString();
  }

  // ===== TRACKBY FUNCTIONS =====

  public trackByChartType(index: number, type: ChartType): string {
    return type;
  }

  public trackByDataSeries(index: number, series: ChartDataSeries): string {
    return series.name;
  }

  public trackByDataPoint(index: number, point: ChartDataPoint): string {
    return point.label + point.value;
  }

  public trackByGridLine(index: number, line: any): string {
    return `${line.x1}-${line.y1}-${line.x2}-${line.y2}`;
  }

  public trackByAxisLabel(index: number, label: any): string {
    return `${label.x}-${label.y}-${label.text}`;
  }

  public trackByPieSlice(index: number, slice: any): string {
    return slice.data.label + slice.data.value;
  }
}
