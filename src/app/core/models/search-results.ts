import { Word } from './word';

export interface SearchResults {
  words: Word[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
