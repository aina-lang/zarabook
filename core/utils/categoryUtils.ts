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
  "religion": "Religions & Spiritualité",
  "comics": "BD / Mangas / Comics",
  "cooking": "Cuisine & Gastronomie",
  "kids": "Jeunesse / Enfants",
  "biography": "Biographie / Mémoires",
  "science": "Sciences & Nature",
  "politics": "Droit & Politique",
  "other": "Autre"
};

/**
 * Retrouve la clé technique à partir de la valeur d'affichage française
 */
export function getCategoryKey(displayValue: string): string {
  if (!displayValue) return 'other';
  // Si c'est déjà une clé valide, on la retourne directement
  if (CATEGORY_MAP[displayValue]) return displayValue;
  
  // Nettoyage basique pour les anciennes données (ex: "Roman / Fiction")
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
