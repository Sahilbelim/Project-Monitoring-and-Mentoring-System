export type ChannelType = 'dm' | 'team' | 'project' | 'group';

export interface Channel {
  _id:          string;
  type:         ChannelType;
  name?:        string;
  description?: string;
  isPrivate?:   boolean;
  memberIds:    string[];
  pinnedMessageIds?: string[];
  lastMessage?:  Message;
  unreadCount?:  number;
  organizationId: string;
  createdAt:    string;
  updatedAt:    string;
  members?:     { _id: string; name: string; avatar?: string }[];
}

export interface Message {
  _id:         string;
  channelId:   string;
  senderId:    string;
  content?:    string;
  type:        'text' | 'file' | 'image';
  replyToId?:  string;
  attachments?: { name: string; url: string; mimeType?: string; sizeBytes?: number }[];
  reactions?:  { emoji: string; userIds: string[] }[];
  deliveredTo?: string[];
  seenBy?:     string[];
  editedAt?:   string;
  deletedFor?: string[];
  isDeleted?:  boolean;
  createdAt:   string;
  updatedAt:   string;
  sender?:     { _id: string; name: string; avatar?: string };
  replyTo?:    Message;
}
