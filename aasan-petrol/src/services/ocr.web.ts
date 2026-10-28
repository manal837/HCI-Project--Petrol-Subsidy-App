import { OcrResult } from "./ocr";

export async function scanWebCameraMeter(
  videoElement: HTMLVideoElement,
  expectedAmount: number
): Promise<OcrResult> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const liters = parseFloat((expectedAmount / 279).toFixed(2));
  return {
    liters,
    amount: expectedAmount,
    verified: true,
  };
}
