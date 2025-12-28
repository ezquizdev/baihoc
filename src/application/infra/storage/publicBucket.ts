import { supabaseServer } from "@/application/infra/storage/supabase";

const ensuredBuckets = new Set<string>();

export async function uploadPublicObject(input: {
  bucket: string;
  path: string;
  body: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string; path: string }> {
  await ensurePublicBucket(input.bucket);

  const { error } = await supabaseServer.storage
    .from(input.bucket)
    .upload(input.path, input.body, {
      contentType: input.contentType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || "Không thể tải lên file");
  }

  const { data } = supabaseServer.storage
    .from(input.bucket)
    .getPublicUrl(input.path);

  return { publicUrl: data.publicUrl, path: input.path };
}

async function ensurePublicBucket(bucket: string) {
  if (ensuredBuckets.has(bucket)) return;
  ensuredBuckets.add(bucket);
  const { error } = await supabaseServer.storage.createBucket(bucket, {
    public: true,
  });
  if (error && !/already exists/i.test(error.message)) {
    ensuredBuckets.delete(bucket);
  }
}
