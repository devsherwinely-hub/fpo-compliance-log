// Shared domain types for the compliance dashboard.
// Keeps components decoupled from Supabase / mock source.

export type LocationId = 'loc-1' | 'loc-2' | 'loc-3';

export interface FacilityLocation {
  id: LocationId | 'all';
  label: string;
  shortLabel: string;
  address?: string;
  unitCount?: number;
}

export type ChecklistFrequency = 'daily' | 'weekly' | 'monthly';

export type TaskStatus = 'complete' | 'pending' | 'overdue' | 'flagged';

export interface ComplianceTask {
  id: string;
  name: string;
  locationId: LocationId;
  frequency: ChecklistFrequency;
  status: TaskStatus;
  dueLabel: string;
  assignee?: string;
  periodLabel: string;
}

export interface KpiMetric {
  id: ChecklistFrequency;
  eyebrow: string;
  title: string;
  period: string;
  completed: number;
  total: number;
}

export interface AlertItem {
  id: string;
  taskName: string;
  locationLabel: string;
}

export type NavSectionId = 'overview' | 'daily' | 'weekly' | 'monthly' | 'history' | 'settings';
