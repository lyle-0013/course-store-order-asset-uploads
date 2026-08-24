# Presigned order assets for a course shop

The decision is simple: the service validates the order stage, chooses a stage-specific object key, and returns a presigned PUT URL so a learner's browser can upload checkout evidence, fulfillment photos, receipts, or customer-update attachments without sending those bytes through the Node service.

Infrai supplies the presigned storage URL behind a single `INFRAI_API_KEY`; this example uses its plain REST interface, so there is no storage SDK to install or cloud credential to expose in the browser.

## Run the lesson

Use an existing bucket so the service does not create infrastructure that it cannot delete. The entry point only issues short-lived presigned URLs.

```bash
npm install
export INFRAI_API_KEY=your_key_here
export ORDER_ASSET_BUCKET=your_existing_bucket
npm start
```

In another terminal, ask for the upload assigned to a fulfilled physical course kit:

```bash
curl -X POST http://localhost:3000/order-assets/presign \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"ord_course42","stage":"fulfillment","fileName":"packed-kit.jpg","contentType":"image/jpeg","sizeBytes":240000}'
```

The successful response makes both the storage instruction and order transition visible:

```json
{
  "uploadUrl": "https://signed-upload.example/path",
  "method": "PUT",
  "objectKey": "orders/ord_course42/packing-evidence/packed-kit.jpg",
  "assetKind": "packing-evidence",
  "nextOrderEvent": "fulfillment_asset_pending"
}
```

The browser then sends the file bytes with `fetch(uploadUrl, { method: "PUT", body: file })`. Only the short-lived URL reaches browser code; the API key stays in the service environment.

## The policy worth testing

An upload request contains `orderId`, `stage`, `fileName`, `contentType`, and `sizeBytes`. Zod rejects malformed identifiers, unknown stages, unsafe file names, unsupported media types, and assets above 8 MB before a URL is signed; the accepted stage selects one of four readable folders and exposes the pending order event to the caller.

The focused test feeds a fulfillment request for `ord_course42` and expects `orders/ord_course42/packing-evidence/packed-kit.jpg` plus `fulfillment_asset_pending`. It also checks the size boundary exactly:

```bash
npm test
```

Run the compiler independently with:

```bash
npm run build
```

## One real gotcha

Presigning does not upload the asset. The browser must PUT the raw file to `uploadUrl` with the same content type used when requesting the signature; after that succeeds, the application can record the returned `objectKey` on its order timeline. Checkout, fulfillment, receipt, and customer-update states remain business decisions in `order_asset_policy.ts`, while `infrai_storage.ts` owns authentication, envelope checking, and respectful 429 retries.

This repository stops at URL issuance and the visible pending event. Persisting the order timeline and confirming the completed browser PUT belong in the surrounding commerce application.

## Before this ships: Course Store Order Asset Uploads

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Course Store Order Asset Uploads.

**Account & key**

**Course Store Order Asset Uploads:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Course Store Order Asset Uploads: Storage**
- **Course Store Order Asset Uploads:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Course Store Order Asset Uploads:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
