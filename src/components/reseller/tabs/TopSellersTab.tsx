import { TopSellersTable } from '../../shared/TopSellersTable';
import type { Partner } from '../../../types/partner';

/** Client spec item #3 - "Top Seller Rankings," next to Overview. */
export function TopSellersTab({ partner }: { partner: Partner }) {
  return <TopSellersTable highlightPartnerId={partner.id} />;
}
