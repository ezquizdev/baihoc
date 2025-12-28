import { uploadStaffQuestionImage } from "@/application/services/mediaService";

export async function controllerUploadStaffQuestionImage(input: {
  userId: string;
  fileName: string | null;
  contentType: string;
  bytes: Buffer;
}) {
  return uploadStaffQuestionImage(input);
}
