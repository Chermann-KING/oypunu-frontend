import { Meaning } from './meaning';

export interface WordTranslation {
  language: string;
  translatedWord: string;
  context?: string[];
  confidence?: number;
  verifiedBy?: string[];
}

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
  translations?: WordTranslation[];
  isFavorite?: boolean;
  audioFiles?: { [key: string]: { url: string } };
}
