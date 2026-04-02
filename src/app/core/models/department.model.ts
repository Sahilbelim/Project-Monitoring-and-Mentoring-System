export interface Department {
  _id:          string;
  name:         string;
  description?: string;
  headId?:      string;
  memberIds:    string[];
  organizationId: string;
  createdAt:    string;
  updatedAt:    string;
  head?:        { _id: string; name: string; avatar?: string };
  members?:     { _id: string; name: string; avatar?: string }[];
}
