export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived';
export type Priority      = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  _id:          string;
  name:         string;
  description?: string;
  status:       ProjectStatus;
  priority?:    Priority;
  color?:       string;
  startDate?:   string;
  deadline?:    string;
  tags?:        string[];
  managerId?:   string;
  teamId?:      string;
  departmentId?: string;
  members:      string[];
  organizationId: string;
  taskCount?:   number;
  completedTaskCount?: number;
  createdAt:    string;
  updatedAt:    string;
}
