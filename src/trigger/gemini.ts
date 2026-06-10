import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiPayloadSchema } from "@/lib/schemas";

async function fetchAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { data: buffer.toString("base64"), mimeType: contentType };
}

export async function geminiTaskRunner(payload: any) {
  const parsed = geminiPayloadSchema.parse(payload);
  const apiKey =
    parsed.geminiApiKey ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is not configured"
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: parsed.model });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (parsed.systemPrompt) {
    parts.push({ text: `System: ${parsed.systemPrompt}\n\nUser: ${parsed.prompt}` });
  } else {
    parts.push({ text: parsed.prompt });
  }

  if (parsed.imageUrls?.length) {
    for (const imageUrl of parsed.imageUrls) {
      if (imageUrl.startsWith("data:")) {
        const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: { mimeType: match[1], data: match[2] },
          });
        }
      } else {
        const { data, mimeType } = await fetchAsBase64(imageUrl);
        parts.push({ inlineData: { data, mimeType } });
      }
    }
  }

  if (parsed.audioUrl) {
    const { data, mimeType } = await fetchAsBase64(parsed.audioUrl);
    parts.push({ inlineData: { data, mimeType } });
  }

  if (parsed.fileUrl) {
    const { data, mimeType } = await fetchAsBase64(parsed.fileUrl);
    parts.push({ inlineData: { data, mimeType } });
  }

  try {
    const result = await model.generateContent(parts);
    const response = result.response.text();
    return { response };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate limit") ||
      message.toLowerCase().includes("too many requests")
    ) {
      throw new Error(
        "Gemini API rate limit or free-tier quota exceeded. Please configure your own Gemini API Key using the Key icon in the top right to bypass rate limits, or wait a moment and try again."
      );
    }
    throw error;
  }
}

export const geminiTask = task({
  id: "gemini-execute",
  maxDuration: 300,
  run: geminiTaskRunner,
});
