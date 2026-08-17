export type MediaAsset = {
  slot: string;
  cloudinary_public_id: string;
  cloudinary_version: number | null;
  secure_url: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAssetHistoryEntry = {
  id: string;
  slot: string;
  cloudinary_public_id: string;
  secure_url: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};
