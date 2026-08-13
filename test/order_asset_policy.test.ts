import assert from "node:assert/strict";
import test from "node:test";
import { chooseOrderAsset, uploadRequestSchema } from "../src/order_asset_policy.js";

test("a fulfilled course-kit order stores packing evidence in its own lesson folder", () => {
  const input = uploadRequestSchema.parse({
    orderId: "ord_course42",
    stage: "fulfillment",
    fileName: "packed-kit.jpg",
    contentType: "image/jpeg",
    sizeBytes: 240_000,
  });

  assert.deepEqual(chooseOrderAsset(input), {
    assetKind: "packing-evidence",
    objectKey: "orders/ord_course42/packing-evidence/packed-kit.jpg",
    nextOrderEvent: "fulfillment_asset_pending",
  });
});

test("an oversized receipt is rejected at the request boundary", () => {
  const result = uploadRequestSchema.safeParse({
    orderId: "ord_course42",
    stage: "receipt",
    fileName: "receipt.pdf",
    contentType: "application/pdf",
    sizeBytes: 8_000_001,
  });
  assert.equal(result.success, false);
});
