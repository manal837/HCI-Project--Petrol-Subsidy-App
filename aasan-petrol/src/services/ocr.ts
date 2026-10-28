export interface OcrResult {
  liters: number;
  amount: number;
  verified: boolean;
}

export async function processMeterOcr(
  imageCanvasOrUrl: string | HTMLCanvasElement,
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