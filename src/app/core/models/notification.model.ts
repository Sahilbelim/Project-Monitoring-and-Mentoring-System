export interface Notification {
  _id:        string;
  recipientId: string;
  type:       string;
  title?:     string;
  message:    string;
  data?:      Record<string, unknown>;
  isRead:     boolean;
  createdAt:  string;
}
