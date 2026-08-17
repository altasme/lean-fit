import { supabase } from './supabase';

type SignedUploadParams = {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
};

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  version: number;
};

async function getSignedUploadParams(slot: string): Promise<SignedUploadParams> {
  const { data, error } = await supabase.functions.invoke('cloudinary-sign', { body: { slot } });
  if (error) throw new Error(error.message);
  return data as SignedUploadParams;
}

/**
 * Uploads directly to Cloudinary from the browser using a signature minted
 * server-side (supabase/functions/cloudinary-sign) - the API secret never
 * reaches the client.
 */
export async function uploadImageToCloudinary(
  file: File,
  slot: string,
): Promise<CloudinaryUploadResult> {
  const params = await getSignedUploadParams(slot);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', params.apiKey);
  formData.append('timestamp', String(params.timestamp));
  formData.append('folder', params.folder);
  formData.append('signature', params.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  return res.json();
}
