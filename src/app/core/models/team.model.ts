export interface Team {
  _id:          string;
  name:         string;
  description?: string;
  leaderId?:    string;
  memberIds:    string[];
  organizationId: string;
  createdAt:    string;
  updatedAt:    string;
  leader?:      { _id: string; name: string; avatar?: string };
  members?:     { _id: string; name: string; avatar?: string }[];
}
