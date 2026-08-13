import { z } from "zod";

export const uploadRequestSchema = z.object({
  orderId: z.string().regex(/^ord_[a-z0-9]+$/),
  stage: z.enum(["checkout", "fulfillment", "receipt", "customer_update"]),
  fileName: z.string().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  sizeBytes: z.number().int().positive().max(8_000_000),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

const folders = {
  checkout: "checkout-proofs",
  fulfillment: "packing-evidence",
  receipt: "receipts",
  customer_update: "customer-updates",
} as const;

export function chooseOrderAsset(input: UploadRequest) {
  const folder = folders[input.stage];
  return {
    assetKind: folder,
    objectKey: `orders/${input.orderId}/${folder}/${input.fileName}`,
    nextOrderEvent: `${input.stage}_asset_pending` as const,
  };
}
