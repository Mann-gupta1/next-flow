import { task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { cropImagePayloadSchema } from "@/lib/schemas";

const execAsync = promisify(exec);

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 300,
  run: async (payload: unknown) => {
    const parsed = cropImagePayloadSchema.parse(payload);
    const { imageUrl, positionX, positionY, width, height } = parsed;

    // Mandatory 30+ second delay before processing
    await new Promise((resolve) => setTimeout(resolve, 31000));

    const tempDir = await mkdtemp(join(tmpdir(), "nextflow-crop-"));
    const inputPath = join(tempDir, "input.jpg");
    const outputPath = join(tempDir, "output.jpg");

    try {
      const imageBuffer = await downloadImage(imageUrl);
      await writeFile(inputPath, imageBuffer);

      // Get image dimensions
      const { stdout: probeOut } = await execAsync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${inputPath}"`
      );
      const [imgWidth, imgHeight] = probeOut.trim().split(",").map(Number);

      const cropW = Math.round((width / 100) * imgWidth);
      const cropH = Math.round((height / 100) * imgHeight);
      const cropX = Math.round((positionX / 100) * imgWidth);
      const cropY = Math.round((positionY / 100) * imgHeight);

      await execAsync(
        `ffmpeg -y -i "${inputPath}" -vf "crop=${cropW}:${cropH}:${cropX}:${cropY}" "${outputPath}"`
      );

      const outputBuffer = await readFile(outputPath);
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      return {
        outputImage: dataUrl,
        croppedAt: new Date().toISOString(),
      };
    } finally {
      try {
        await unlink(inputPath);
        await unlink(outputPath);
      } catch {
        // ignore cleanup errors
      }
    }
  },
});
