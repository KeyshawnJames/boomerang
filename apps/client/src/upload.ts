import { presignUpload, type PresignRequest } from "api";
import type { ImagePickerAsset } from "expo-image-picker";

import i18n from "./i18n";

const TYPES: string[] = ["image/jpeg", "image/png", "image/heic"];

// Uploads the photo to a presigned URL (ADR 0014) and returns the key for POST /returns.
// Errors are thrown as { detail } so errorMessage() shows them.
export async function uploadPhoto(
  kind: PresignRequest["kind"],
  asset: ImagePickerAsset,
): Promise<string> {
  const contentType = asset.mimeType ?? "image/jpeg";
  if (!TYPES.includes(contentType)) {
    throw { detail: i18n.t("photos.wrongType") };
  }
  const { data } = await presignUpload({
    body: {
      kind,
      content_type: contentType as PresignRequest["content_type"],
    },
    throwOnError: true,
  });
  const photo = await (await fetch(asset.uri)).blob();
  const response = await fetch(data.url, {
    method: "PUT",
    headers: { "Content-Type": contentType, "Accept-Language": i18n.language },
    body: photo,
  });
  if (!response.ok) throw await response.json();
  return data.key;
}
