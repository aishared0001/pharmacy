import { supabase } from './supabase';

// Uploads a local image (from expo-image-picker) to a Supabase Storage bucket
// and returns a usable URL.
//
// - `prescriptions` is a private bucket: we return a signed URL (valid long
//   enough for the owner to review the order).
// - `product-images` is public: we return the public URL.

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

function extFromUri(uri: string): string {
  const match = /\.(\w+)(?:\?.*)?$/.exec(uri);
  return (match?.[1] ?? 'jpg').toLowerCase();
}

export async function uploadPrescription(
  userId: string,
  localUri: string,
): Promise<string> {
  const ext = extFromUri(localUri);
  const path = `${userId}/${Date.now()}.${ext}`;
  const body = await uriToArrayBuffer(localUri);

  const { error } = await supabase.storage
    .from('prescriptions')
    .upload(path, body, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  if (error) throw error;

  // Private bucket: create a signed URL valid for 30 days.
  const { data, error: signError } = await supabase.storage
    .from('prescriptions')
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signError) throw signError;
  return data.signedUrl;
}

export async function uploadProductImage(
  productId: string,
  localUri: string,
): Promise<string> {
  const ext = extFromUri(localUri);
  const path = `${productId}/${Date.now()}.${ext}`;
  const body = await uriToArrayBuffer(localUri);

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, body, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: true,
    });
  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}
