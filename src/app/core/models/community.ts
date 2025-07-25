import { User } from './user';

// community.ts
export interface Community {
  _id: string;
  name: string;
  language: string;
  description?: string;
  memberCount: number;
  createdBy: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  tags?: string[];
  isPrivate?: boolean;
  coverImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// community-member.ts
export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  joinedAt: Date;
  role: 'member' | 'moderator' | 'admin';
}

// community-post.ts et autres modèles...
