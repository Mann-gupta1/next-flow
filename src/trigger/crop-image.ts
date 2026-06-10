import { task } from "@trigger.dev/sdk/v3";
import { Jimp } from "jimp";
import { cropImagePayloadSchema } from "@/lib/schemas";

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function cropImageTaskRunner(payload: any) {
  const parsed = cropImagePayloadSchema.parse(payload);
  const { imageUrl, positionX, positionY, width, height } = parsed;

  const imageBuffer = await downloadImage(imageUrl);
  const image = await Jimp.read(imageBuffer);

  const imgWidth = image.bitmap.width;
  const imgHeight = image.bitmap.height;

  const cropW = Math.round((width / 100) * imgWidth);
  const cropH = Math.round((height / 100) * imgHeight);
  const cropX = Math.round((positionX / 100) * imgWidth);
  const cropY = Math.round((positionY / 100) * imgHeight);

  // Crop the image
  image.crop({ x: cropX, y: cropY, w: cropW, h: cropH });

  // Get base64 data URL
  const dataUrl = await image.getBase64("image/jpeg");

  return {
    outputImage: dataUrl,
    croppedAt: new Date().toISOString(),
  };
}

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 300,
  run: cropImageTaskRunner,
});
