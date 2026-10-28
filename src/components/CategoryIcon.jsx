import React from 'react';
import {
  Wheat, SprayCan, Salad, Snowflake, Milk, Tag, UtensilsCrossed, Beef, Carrot, Apple, Coffee, Wine, Soup, Package,
} from 'lucide-react';

const BY_ID = { all: UtensilsCrossed, dry: Wheat, shamai: SprayCan, salads: Salad, frozen: Snowflake };

// Custom categories (typed by the user or imported) get an icon from their name when it is a familiar one.
const BY_WORD = [
  [/מקרר|חלב|גבינ/, Milk], [/קפוא|הקפא/, Snowflake], [/יבש|קמח|אורז|דגנ/, Wheat], [/ניקיון|ניקוי|חד.?פעמי|שמאי/, SprayCan],
  [/סלט/, Salad], [/ירק|פירות|שוק/, Carrot], [/פרי/, Apple], [/בשר|עוף|דג/, Beef], [/משקה|שתי|יין/, Wine],
  [/קפה|תה/, Coffee], [/מרק|רוטב|שימור/, Soup], [/אריז|כלי/, Package],
];

export const iconFor = (id, label = '') => BY_ID[id] || BY_WORD.find(([re]) => re.test(`${id} ${label}`))?.[1] || Tag;

export default function CategoryIcon({ id, label, size = 16, className = '' }) {
  const Icon = iconFor(id, label);
  return <Icon size={size} className={className} aria-hidden="true" />;
}
