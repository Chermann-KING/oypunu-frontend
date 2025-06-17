import { Meaning } from './meaning';

export interface Word {
  id: string;
  word: string;
  language: string;
  categoryId?: string;
  pronunciation?: string;
  etymology?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  status: 'approved' | 'pending' | 'rejected';
  meanings?: Meaning[];
  isFavorite?: boolean;
}
