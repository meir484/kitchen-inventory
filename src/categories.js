export const CATEGORIES = [
  { id: 'dry', label: 'יבשים' },
  { id: 'shamai', label: 'ר. שמאי' },
  { id: 'salads', label: 'סלטים' },
  { id: 'frozen', label: 'קפואים' },
];

export const UNITS = ['יח׳', 'ק״ג', 'גרם', 'ליטר', 'מ״ל', 'חבילות', 'בקבוקים', 'קופסאות'];

// Known categories get their Hebrew label; any other id is shown as its own text.
export const catLabel = (id) =>
  CATEGORIES.find((c) => c.id === id) || { id, label: id || 'כללי' };

export const categoryIdFromLabel = (text) => {
  const t = (text || '').trim();
  return CATEGORIES.find((c) => c.label === t)?.id || t || 'כללי';
};

// Known categories first (in their fixed order), then custom ones in order of appearance.
export const categoriesOf = (items) => {
  const ids = [...new Set(items.map((i) => i.category))];
  const known = CATEGORIES.filter((c) => ids.includes(c.id));
  const custom = ids.filter((id) => !CATEGORIES.some((c) => c.id === id)).map(catLabel);
  return [...known, ...custom];
};
