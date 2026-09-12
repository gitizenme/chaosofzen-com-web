// The shorts an entry can belong to is PRODUCT_SLUGS, defined beside the
// product record, so a short cannot name a product with no pages behind it.
import type { ProductSlug } from './products';

export interface Cut {
  /** https://media.chaosofzen.com/social/<asset_id>/render-*.mp4 */
  url: string;
  /** https://media.chaosofzen.com/social/<asset_id>/poster-*.jpg */
  poster: string;
  width: number;
  height: number;
}

export interface ShortData {
  product: ProductSlug;
  /** YYYY-MM-DD-<episode-slug>; also the content file's stem. */
  asset_id: string;
  episode: string;
  title: string;
  hook: string;
  /** YYYY-MM-DD, the asset_id's date. */
  date: string;
  media: { landscape?: Cut; vertical?: Cut };
}

export type CutKind = 'landscape' | 'vertical';

// One product's shorts, newest first. Dates tie when two kits share a day
// (S01 and S02 both did on 2026-09-11); the tie resolves by asset_id
// descending, which is date-then-slug, so the result cannot depend on input
// order -- the comparator defect changelog.ts's comment records.
export function shortsFor<T extends { data: ShortData }>(entries: readonly T[], slug: ProductSlug): T[] {
  return entries
    .filter(e => e.data.product === slug)
    .sort((a, b) => {
      const dateCmp = b.data.date.localeCompare(a.data.date);
      return dateCmp !== 0 ? dateCmp : b.data.asset_id.localeCompare(a.data.asset_id);
    });
}

// The cuts an entry carries, landscape first: the wide card leads, the tall
// one sits beside it. Pure so the component and its test share one answer.
export function cutsOf(media: ShortData['media']): { kind: CutKind; cut: Cut }[] {
  const out: { kind: CutKind; cut: Cut }[] = [];
  if (media.landscape) out.push({ kind: 'landscape', cut: media.landscape });
  if (media.vertical) out.push({ kind: 'vertical', cut: media.vertical });
  return out;
}
