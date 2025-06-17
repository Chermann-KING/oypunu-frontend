import { Definition } from './definition';
import { Phonetic } from './phonetic';

export interface Meaning {
  id: string;
  wordId: string;
  partOfSpeech: string; // noun, verb, adjective, etc.
  definitions?: Definition[];
  synonyms?: string[];
  antonyms?: string[];
  examples?: string[];
  phonetics?: Phonetic[];
}
