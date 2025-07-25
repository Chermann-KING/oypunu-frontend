export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User;
  receiverId: User;
  content: string;
  messageType: 'text' | 'word_share';
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: {
    _id: string;
    content: string;
    messageType: 'text' | 'word_share';
    createdAt: Date;
    isRead: boolean;
    senderId: {
      username: string;
    };
  };
  lastActivity: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  messageType?: 'text' | 'word_share';
  metadata?: Record<string, any>;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  pages: number;
}
