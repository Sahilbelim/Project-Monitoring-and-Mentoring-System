export type TaskStatus   = 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  _id:            string;
  title:          string;
  description?:   string;
  status:         TaskStatus;
  priority:       TaskPriority;
  projectId:      string;
  parentTaskId?:  string;
  assigneeIds:    string[];
  dueDate?:       string;
  startDate?:     string;
  estimatedHours?: number;
  loggedHours?:   number;
  labels?:        string[];
  tags?:          string[];
  orderIndex?:    number;
  organizationId: string;
  createdAt:      string;
  updatedAt:      string;
  // populated
  assignees?:     { _id: string; name: string; avatar?: string }[];
  project?:       { _id: string; name: string; color?: string };
}

export interface Comment {
  _id:        string;
  taskId:     string;
  authorId:   string;
  parentId?:  string;
  content?:   string;
  text?:      string;
  mentions?:  string[];
  attachments?: Attachment[];
  reactions?:  Reaction[];
  createdAt:  string;
  updatedAt:  string;
  author?:    { _id: string; name: string; avatar?: string };
}

export interface Reaction {
  emoji:   string;
  userIds: string[];
}

export interface Attachment {
  name:      string;
  url:       string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface TimeLog {
  _id:     string;
  taskId:  string;
  userId:  string;
  hours:   number;
  note?:   string;
  date?:   string;
  createdAt: string;
}
