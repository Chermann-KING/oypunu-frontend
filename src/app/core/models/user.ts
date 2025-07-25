export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  isOnline?: boolean;
  lastActive?: Date;
  nativeLanguage?: string;
  learningLanguages?: string[];
  contacts?: string[];
  roles?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  bio?: string;
  location?: string;
  website?: string;
  isProfilePublic?: boolean;
  isEmailVerified?: boolean;
  role?: string;
}

export interface UserStats {
  totalWordsAdded: number;
  totalCommunityPosts: number;
  favoriteWordsCount: number;
  joinDate: Date;
}
