export const CATEGORIES = [
  { id: 'dry', label: 'יבשים', emoji: '🌾' },
  { id: 'shamai', label: 'ר. שמאי', emoji: '🧹' },
  { id: 'salads', label: 'סלטים', emoji: '🥗' },
  { id: 'frozen', label: 'קפואים', emoji: '🍟' },
];

export const UNITS = ['יח׳', 'ק״ג', 'גרם', 'ליטר', 'מ״ל', 'חבילות', 'בקבוקים', 'קופסאות'];

const GENERIC_EMOJI = '📦';

// Known categories keep their emoji; any other id is shown as its own text.
export const catLabel = (id) =>
  CATEGORIES.find((c) => c.id === id) || { id, label: id || 'כללי', emoji: GENERIC_EMOJI };

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
