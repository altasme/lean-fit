/**
 * Website image slot registry - Admin Panel spec §6-7. Each slot defines
 * its own recommended spec rather than one universal size/ratio for every
 * asset (§7). Admin-managed uploads for these slots live in Cloudinary;
 * `media_assets`/`media_asset_history` (migration 0003) only store the
 * reference. Adding a new slot is a code change here, not a migration.
 */

export type MediaSlotKey =
  | 'hero_desktop'
  | 'hero_mobile'
  | 'product_card'
  | 'lifestyle_morning'
  | 'lifestyle_pre_workout'
  | 'lifestyle_midday'
  | 'lifestyle_on_the_go'
  | 'testimonial'
  | 'promotional_banner'
  | 'og_share_image';

export type MediaSlotSpec = {
  key: MediaSlotKey;
  label: string;
  description: string;
  recommendedSize: string;
  aspectRatioLabel: string;
  aspectRatioValue: number; // width / height, for the CSS preview box
  format: string;
  maxSizeMB: number;
  notes?: string;
};

export const MEDIA_SLOTS: MediaSlotSpec[] = [
  {
    key: 'hero_desktop',
    label: 'Hero - Desktop',
    description: 'Full-bleed hero background, desktop/tablet viewport.',
    recommendedSize: '1920 × 800 px',
    aspectRatioLabel: '12:5',
    aspectRatioValue: 1920 / 800,
    format: 'JPG / WebP',
    maxSizeMB: 3,
    notes: 'Keep the headline safe area (left two-thirds) clear of key subjects.',
  },
  {
    key: 'hero_mobile',
    label: 'Hero - Mobile',
    description: 'Hero background, mobile viewport.',
    recommendedSize: '1080 × 1350 px',
    aspectRatioLabel: '4:5',
    aspectRatioValue: 1080 / 1350,
    format: 'JPG / WebP',
    maxSizeMB: 2,
  },
  {
    key: 'product_card',
    label: 'Product Card',
    description: 'Primary product shot - Product Intro and Purchase sections.',
    recommendedSize: '1024 × 1024 px',
    aspectRatioLabel: '1:1',
    aspectRatioValue: 1,
    format: 'JPG / PNG / WebP',
    maxSizeMB: 2,
  },
  {
    key: 'lifestyle_morning',
    label: 'Lifestyle - Morning',
    description: 'Lifestyle section, "Morning" moment.',
    recommendedSize: '1200 × 1500 px',
    aspectRatioLabel: '4:5',
    aspectRatioValue: 1200 / 1500,
    format: 'JPG / WebP',
    maxSizeMB: 2,
  },
  {
    key: 'lifestyle_pre_workout',
    label: 'Lifestyle - Pre-Workout',
    description: 'Lifestyle section, "Pre-Workout" moment.',
    recommendedSize: '1200 × 1500 px',
    aspectRatioLabel: '4:5',
    aspectRatioValue: 1200 / 1500,
    format: 'JPG / WebP',
    maxSizeMB: 2,
  },
  {
    key: 'lifestyle_midday',
    label: 'Lifestyle - Midday',
    description: 'Lifestyle section, "Midday" moment.',
    recommendedSize: '1200 × 1500 px',
    aspectRatioLabel: '4:5',
    aspectRatioValue: 1200 / 1500,
    format: 'JPG / WebP',
    maxSizeMB: 2,
  },
  {
    key: 'lifestyle_on_the_go',
    label: 'Lifestyle - On The Go',
    description: 'Lifestyle section, "On the Go" moment.',
    recommendedSize: '1200 × 1500 px',
    aspectRatioLabel: '4:5',
    aspectRatioValue: 1200 / 1500,
    format: 'JPG / WebP',
    maxSizeMB: 2,
  },
  {
    key: 'testimonial',
    label: 'Testimonial Photo',
    description: 'Reusable slot for a featured customer/UGC photo.',
    recommendedSize: '800 × 800 px',
    aspectRatioLabel: '1:1',
    aspectRatioValue: 1,
    format: 'JPG / WebP',
    maxSizeMB: 1.5,
  },
  {
    key: 'promotional_banner',
    label: 'Promotional Banner',
    description: 'Campaign/sale banner for the homepage or social posts.',
    recommendedSize: '1600 × 900 px',
    aspectRatioLabel: '16:9',
    aspectRatioValue: 16 / 9,
    format: 'JPG / PNG / WebP',
    maxSizeMB: 3,
  },
  {
    key: 'og_share_image',
    label: 'Social Share (OG) Image',
    description: 'Preview image shown when a page link is shared on Facebook/social.',
    recommendedSize: '1200 × 630 px',
    aspectRatioLabel: '1.91:1',
    aspectRatioValue: 1200 / 630,
    format: 'JPG / PNG',
    maxSizeMB: 1,
  },
];
