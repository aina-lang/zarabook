export const CATEGORY_MAP: Record<string, string> = {
  "fiction": "Roman / Fiction",
  "science_fiction": "Science-Fiction",
  "fantasy": "Fantasy",
  "thriller": "Policier & Thriller",
  "self_help": "Développement Personnel",
  "business": "Business & Économie",
  "tech": "Informatique & Tech",
  "education": "Cours & Éducation",
  "health": "Santé & Bien-être",
  "art": "Art & Design",
  "history": "Histoire",
  "other": "Autre"
};

/**
 * Retrouve la clé technique à partir de la valeur d'affichage française
 */
export function getCategoryKey(displayValue: string): string {
  if (!displayValue) return 'other';
  // Nettoyage basique (ex: supprimer le point de splite si on ne l'utilise pas ici)
  const entry = Object.entries(CATEGORY_MAP).find(([_, val]) => 
    val.toLowerCase() === displayValue.toLowerCase() || 
    displayValue.toLowerCase().startsWith(val.split(' ')[0].toLowerCase())
  );
  return entry ? entry[0] : 'other';
}

/**
 * Retourne la catégorie localisée
 */
export function getLocalizedCategory(displayValue: string, t: (key: string) => string): string {
  const key = getCategoryKey(displayValue);
  return t(`categories.${key}`);
}
