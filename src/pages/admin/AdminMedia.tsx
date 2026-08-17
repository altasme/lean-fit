import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { getMediaAssetHistory, listMediaAssets, saveMediaAsset } from '../../lib/adminMedia';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { MEDIA_SLOTS } from '../../content/mediaSlots';
import type { MediaSlotSpec } from '../../content/mediaSlots';
import type { MediaAsset, MediaAssetHistoryEntry } from '../../types/media';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function AdminMedia() {
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    listMediaAssets()
      .then((list) => {
        setAssets(Object.fromEntries(list.map((a) => [a.slot, a])));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(load, []);

  return (
    <AdminLayout>
      <h1 className="font-kicker text-2xl uppercase tracking-wide2 text-lf-white">Media</h1>
      <p className="mt-2 max-w-2xl text-sm text-lf-cream/60">
        Replace website images without a code deploy. Each slot has its own recommended spec -
        uploads go to Cloudinary; previous versions are kept in history below each slot.
      </p>

      {error && <p className="mt-4 text-sm text-lf-error">{error}</p>}
      {loading && <p className="mt-4 text-sm text-lf-cream/60">Loading…</p>}

      {!loading && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIA_SLOTS.map((slot) => (
            <MediaSlotCard
              key={slot.key}
              slot={slot}
              asset={assets[slot.key] ?? null}
              onUploaded={load}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function MediaSlotCard({
  slot,
  asset,
  onUploaded,
}: {
  slot: MediaSlotSpec;
  asset: MediaAsset | null;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<MediaAssetHistoryEntry[] | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (selected.size > slot.maxSizeMB * 1024 * 1024) {
      setError(`File is too large - max ${slot.maxSizeMB}MB for this slot.`);
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadImageToCloudinary(file, slot.key);
      await saveMediaAsset(slot.key, result);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function toggleHistory() {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    if (!history) {
      getMediaAssetHistory(slot.key)
        .then(setHistory)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history.'));
    }
  }

  const displayUrl = previewUrl ?? asset?.secure_url;

  return (
    <div className="flex flex-col rounded-sm border border-white/10 bg-lf-charcoal p-5">
      <h2 className="font-kicker text-sm uppercase tracking-wide2 text-lf-white">{slot.label}</h2>
      <p className="mt-1 text-xs text-lf-cream/60">{slot.description}</p>

      <div
        className="mt-4 w-full overflow-hidden rounded-sm border border-white/10 bg-lf-black bg-cover bg-center"
        style={{ aspectRatio: slot.aspectRatioValue }}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={slot.label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-lf-cream/40">
            No image uploaded yet
          </div>
        )}
      </div>

      <dl className="tabular mt-3 space-y-1 text-xs text-lf-cream/60">
        <div className="flex justify-between">
          <dt>Recommended</dt>
          <dd className="text-lf-cream/80">{slot.recommendedSize}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Aspect Ratio</dt>
          <dd className="text-lf-cream/80">{slot.aspectRatioLabel}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Format</dt>
          <dd className="text-lf-cream/80">{slot.format}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Max Size</dt>
          <dd className="text-lf-cream/80">{slot.maxSizeMB}MB</dd>
        </div>
      </dl>
      {slot.notes && <p className="mt-2 text-xs text-lf-gold/80">{slot.notes}</p>}

      {asset && (
        <p className="mt-2 text-xs text-lf-cream/40">
          Current: {asset.width}×{asset.height} · {formatBytes(asset.bytes)} · uploaded{' '}
          {new Date(asset.uploaded_at).toLocaleDateString('en-PH')}
        </p>
      )}

      <div className="mt-4 space-y-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-xs text-lf-cream/70 file:mr-3 file:rounded-sm file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-lf-white hover:file:bg-white/20"
        />
        {error && <p className="text-xs text-lf-error">{error}</p>}
        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="btn-gold w-full !py-2 !text-sm disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Confirm & Upload'}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={toggleHistory}
        className="mt-3 text-left text-xs text-lf-gold hover:underline"
      >
        {historyOpen ? '− Hide history' : '+ View history'}
      </button>

      {historyOpen && (
        <ul className="mt-2 space-y-2 border-t border-white/10 pt-2">
          {history === null && <li className="text-xs text-lf-cream/40">Loading…</li>}
          {history?.length === 0 && <li className="text-xs text-lf-cream/40">No previous uploads.</li>}
          {history?.map((h) => (
            <li key={h.id} className="flex items-center gap-2 text-xs text-lf-cream/60">
              <img src={h.secure_url} alt="" className="h-8 w-8 rounded-sm object-cover" />
              <span>{new Date(h.created_at).toLocaleString('en-PH')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
