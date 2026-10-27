export const CRUZIN_ZONES = [
  { name: 'Fond du Lac', zips: ['54935', '54936', '54937'], fee: 0, needs_review: false },
  { name: 'North Fond du Lac', zips: ['54937'], fee: 0, needs_review: false },
  { name: 'Eden', zips: ['53019'], fee: 0, needs_review: false },
  { name: 'Van Dyne', zips: ['54979'], fee: 0, needs_review: false },
  { name: 'Oakfield', zips: ['53065'], fee: 0, needs_review: false },
  { name: 'Mount Calvary', zips: ['53057'], fee: 0, needs_review: false },
  { name: 'Eldorado', zips: ['54932'], fee: 0, needs_review: false },
  { name: 'Malone', zips: ['53049'], fee: 0, needs_review: false },
  { name: 'Rosendale', zips: ['54974'], fee: 0, needs_review: false },
  { name: 'Brownsville', zips: ['53006'], fee: 0, needs_review: false },
  { name: 'Saint Cloud', zips: ['53079'], fee: 0, needs_review: false },
  { name: 'Lomira', zips: ['53048'], fee: 0, needs_review: false },
  { name: 'Glenbeulah', zips: ['53023'], fee: 0, needs_review: false },
  { name: 'Brandon', zips: ['53919'], fee: 0, needs_review: false },
  { name: 'Waupun', zips: ['53963'], fee: 0, needs_review: false },
  { name: 'Mayville', zips: ['53050'], fee: 0, needs_review: false },
  { name: 'Theresa', zips: ['53091'], fee: 0, needs_review: false },
  { name: 'Pickett', zips: ['54964'], fee: 10, needs_review: false },
  { name: 'Cascade', zips: ['53011'], fee: 10, needs_review: false },
  { name: 'Ripon', zips: ['54971'], fee: 10, needs_review: false },
  { name: 'Chilton', zips: ['53014'], fee: 10, needs_review: false },
  { name: 'New Holstein', zips: ['53061'], fee: 10, needs_review: false },
  { name: 'Kiel', zips: ['53042'], fee: 10, needs_review: false },
  { name: 'Oshkosh', zips: ['54901', '54902', '54903', '54904'], fee: 20, needs_review: false },
  { name: 'Berlin', zips: ['54923'], fee: 20, needs_review: false },
  { name: 'Omro', zips: ['54963'], fee: 10, needs_review: false },
  { name: 'Winneconne', zips: ['54986'], fee: 10, needs_review: false },
  { name: 'Appleton', zips: ['54911', '54912', '54913', '54914', '54915', '54919'], fee: 30, needs_review: false },
  { name: 'Green Bay', zips: ['54301', '54302', '54303', '54304', '54311', '54313'], fee: 30, needs_review: false },
];

export function findCruzinZone(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return CRUZIN_ZONES.filter(
    (z) =>
      z.name.toLowerCase().includes(needle) || z.zips.some((zip) => zip.startsWith(needle))
  );
}