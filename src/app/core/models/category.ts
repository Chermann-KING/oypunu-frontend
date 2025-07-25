export interface Category {
  _id: string; // _id pour correspondre à MongoDB
  id?: string; // id comme optionnel pour la compatibilité avec le composant
  name: string;
  description?: string;
  language: string;
}
