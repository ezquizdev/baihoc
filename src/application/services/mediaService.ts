import { uploadPublicObject } from "@/application/infra/storage/publicBucket";
import { ServiceError } from "@/application/services/errors";

const QUESTION_MEDIA_BUCKET = "question-media";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export async function uploadStaffQuestionImage(input: {
  userId: string;
  fileName: string | null;
  contentType: string;
  bytes: Buffer;
}): Promise<{ url: string }> {
  if (!input.contentType || !input.contentType.startsWith("image/")) {
    throw new ServiceError(
      "MEDIA_INVALID_TYPE",
      "Chỉ hỗ trợ upload ảnh (image/*).",
      400,
    );
  }

  if (!input.bytes.length) {
    throw new ServiceError("MEDIA_EMPTY", "File ảnh không hợp lệ.", 400);
  }

  if (input.bytes.length > MAX_IMAGE_BYTES) {
    throw new ServiceError(
      "MEDIA_TOO_LARGE",
      "Ảnh quá lớn (tối đa 10MB).",
      413,
    );
  }

  const extension = sanitizeImageExtension(input.contentType) ?? "png";
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const objectId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? (crypto as { randomUUID: () => string }).randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const safeBaseName = sanitizeFileBaseName(input.fileName) ?? "image";
  const path = `${input.userId}/${yyyy}/${mm}/${objectId}-${safeBaseName}.${extension}`;

  const { publicUrl } = await uploadPublicObject({
    bucket: QUESTION_MEDIA_BUCKET,
    path,
    body: input.bytes,
    contentType: input.contentType,
  });

  return { url: publicUrl };
}

function sanitizeImageExtension(mime: string) {
  const ext = mime.split("/")[1]?.toLowerCase();
  if (!ext) return null;
  if (!/^[a-z0-9]+$/.test(ext)) return null;
  if (ext === "jpeg") return "jpg";
  return ext;
}

function sanitizeFileBaseName(name: string | null) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const base = trimmed.replace(/\.[a-z0-9]+$/i, "");
  const safe = base
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe || null;
}
