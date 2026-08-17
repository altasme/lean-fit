import { supabase } from './supabase';
import type { MediaAsset, MediaAssetHistoryEntry } from '../types/media';
import type { CloudinaryUploadResult } from './cloudinary';
import { writeAuditLog } from './auditLog';

export async function listMediaAssets(): Promise<MediaAsset[]> {
  const { data, error } = await supabase.from('media_assets').select('*');
  if (error) throw new Error(error.message);
  return data as MediaAsset[];
}

export async function getMediaAssetHistory(slot: string): Promise<MediaAssetHistoryEntry[]> {
  const { data, error } = await supabase
    .from('media_asset_history')
    .select('*')
    .eq('slot', slot)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as MediaAssetHistoryEntry[];
}

/** Records a completed Cloudinary upload as the slot's active asset, and appends it to history. */
export async function saveMediaAsset(
  slot: string,
  upload: CloudinaryUploadResult,
): Promise<MediaAsset> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const shared = {
    slot,
    cloudinary_public_id: upload.public_id,
    secure_url: upload.secure_url,
    format: upload.format,
    width: upload.width,
    height: upload.height,
    bytes: upload.bytes,
    uploaded_by: user?.id ?? null,
  };

  const { data, error } = await supabase
    .from('media_assets')
    .upsert({ ...shared, cloudinary_version: upload.version, uploaded_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: historyError } = await supabase.from('media_asset_history').insert(shared);
  if (historyError) throw new Error(historyError.message);

  await writeAuditLog({
    entity_type: 'media',
    entity_id: slot,
    action: 'image_replaced',
    field: slot,
    new_value: upload.secure_url,
  });

  return data as MediaAsset;
}
