import { processMeterOcr, OcrResult } from './ocr';

export async function scanNativePhotoMeter(
  photoPathOrBase64: string,
  expectedAmount: number
): Promise<OcrResult> {
  return await processMeterOcr(photoPathOrBase64, expectedAmount);
}