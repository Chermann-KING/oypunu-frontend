export interface SearchParams {
  query: string;
  languages?: string[];
  categories?: string[];
  partsOfSpeech?: string[];
  page: number;
  limit: number;
}
