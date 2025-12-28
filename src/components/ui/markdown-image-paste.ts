import type React from "react";

type TextControlElement = HTMLInputElement | HTMLTextAreaElement;
type SetValue = (value: string | ((prev: string) => string)) => void;
type SetNumber = (value: number | ((prev: number) => number)) => void;
type SetError = (
  value: string | null | ((prev: string | null) => string | null),
) => void;

const DEFAULT_UPLOAD_ENDPOINT = "/api/staff/media/images";

export function handleMarkdownImagePaste(
  event: React.ClipboardEvent<TextControlElement>,
  opts: {
    setValue: SetValue;
    uploadEndpoint?: string;
    setUploadingCount?: SetNumber;
    setUploadError?: SetError;
    altPrefix?: string;
  },
) {
  const files = getImageFilesFromClipboard(event.clipboardData);
  if (!files.length) return;

  event.preventDefault();
  opts.setUploadError?.(null);

  const target = event.currentTarget;
  const currentValue = target.value ?? "";
  const selectionStart = target.selectionStart ?? currentValue.length;
  const selectionEnd = target.selectionEnd ?? currentValue.length;

  const placeholders = files.map((file) => ({
    file,
    placeholderId: makePlaceholderId(),
  }));

  const insertion = placeholders
    .map(
      ({ placeholderId }) =>
        `![Uploading image...]({{upload:${placeholderId}}})`,
    )
    .join(target instanceof HTMLTextAreaElement ? "\n\n" : " ");

  const suffix = target instanceof HTMLTextAreaElement ? "\n" : "";

  const nextValue =
    currentValue.slice(0, selectionStart) +
    insertion +
    suffix +
    currentValue.slice(selectionEnd);

  const nextCaret = selectionStart + insertion.length + suffix.length;
  opts.setValue(nextValue);
  requestAnimationFrame(() => {
    try {
      target.setSelectionRange(nextCaret, nextCaret);
    } catch {
      // Ignore selection failures (e.g. element unmounted).
    }
  });

  placeholders.reduce(
    (prev, { file, placeholderId }) =>
      prev.then(async () => {
        const placeholder = `![Uploading image...]({{upload:${placeholderId}}})`;
        opts.setUploadingCount?.((count) => count + 1);
        try {
          const { url } = await uploadImageFile(
            file,
            opts.uploadEndpoint ?? DEFAULT_UPLOAD_ENDPOINT,
          );
          const alt = makeAltText(file, opts.altPrefix);
          const markdown = `![${alt}](${url})`;
          opts.setValue((value) =>
            value.includes(placeholder)
              ? value.replace(placeholder, markdown)
              : appendMarkdown(value, markdown),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Không thể upload ảnh";
          opts.setUploadError?.(message);
          opts.setValue((value) =>
            value.includes(placeholder)
              ? value.replace(placeholder, "")
              : value,
          );
        } finally {
          opts.setUploadingCount?.((count) => Math.max(0, count - 1));
        }
      }),
    Promise.resolve(),
  );
}

function getImageFilesFromClipboard(clipboardData: DataTransfer | null) {
  if (!clipboardData?.items?.length) return [];
  const files: File[] = [];
  for (const item of clipboardData.items) {
    if (item.kind !== "file") continue;
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}

async function uploadImageFile(file: File, endpoint: string) {
  const formData = new FormData();
  formData.append("file", file, file.name || "image");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload?.error ?? "Không thể upload ảnh");
  }
  if (!payload?.url) {
    throw new Error("Không thể upload ảnh");
  }
  return { url: payload.url };
}

function makePlaceholderId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeAltText(file: File, prefix?: string) {
  const raw = (file.name || "").trim();
  const base = raw ? raw.replace(/\.[a-z0-9]+$/i, "") : "image";
  const cleaned = base
    .trim()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ");
  const combined = prefix ? `${prefix} ${cleaned}` : cleaned;
  return combined.slice(0, 80) || "image";
}

function appendMarkdown(value: string, markdown: string) {
  const trimmed = value.trimEnd();
  const needsNewLine = trimmed.length > 0 && !trimmed.endsWith("\n");
  return `${trimmed}${needsNewLine ? "\n" : ""}\n${markdown}\n`;
}
