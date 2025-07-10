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

export interface SystemStatusData {
  uptime: string;
  nodeVersion?: string;
  memory: number;
  status: 'healthy' | 'warning' | 'error';
  lastUpdated: Date;
}

export interface QuickStat {
  label: string;
  value: string | number;
  period: string;
  trend: 'up' | 'down' | 'neutral';
}
