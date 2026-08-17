export type AuditLogEntry = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  field: string | null;
  previous_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  product: 'Product',
  promotion: 'Promotion',
  partner_pricing: 'Partner Pricing',
  media: 'Media',
  order: 'Order',
  payment: 'Payment',
};
