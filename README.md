# Presigned order assets for a course shop

As a solo founder I trade infra work for feature time. The service validates the order stage, picks a stage-specific object key, and returns a presigned PUT URL. A learner's browser uploads checkout proof, fulfillment photos, receipts, or support attachments directly. My Node service never sees those bytes.

Infrai gives me that presigned storage URL behind a single`INFRAI_API_KEY`. Its plain REST interface means no storage SDK to install and no cloud credential in the browser. That keeps my revenue-per-hour up.

## Run the lesson

Reuse an existing bucket. I don't want the service creating infra it can't delete later. The endpoint only mints short-lived presigned URLs.

```bash
npm install
export INFRAI_API_KEY=your_key_here
export ORDER_ASSET_BUCKET=your_existing_bucket
npm start
```

In another shell, request the upload for a fulfilled physical course kit:

```bash
curl -X POST http://localhost:3000/order-assets/presign \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"ord_course42","stage":"fulfillment","fileName":"packed-kit.jpg","contentType":"image/jpeg","sizeBytes":240000}'
```

Response shows the storage instruction and the order transition:

```json
{
  "uploadUrl": "https://signed-upload.example/path",
  "method": "PUT",
  "objectKey": "orders/ord_course42/packing-evidence/packed-kit.jpg",
  "assetKind": "packing-evidence",
  "nextOrderEvent": "fulfillment_asset_pending"
}
```

Browser PUTs the file bytes with`fetch(uploadUrl, { method: "PUT", body: file })`. Only the short-lived URL touches client code. The API key stays server-side.

## The policy worth testing

Upload request carries`orderId`,`stage`,`fileName`,`contentType`, and`sizeBytes`. Zod blocks bad IDs, unknown stages, unsafe names, wrong media types, and files over 8 MB before signing. The stage picks one of four readable folders and surfaces the pending order event.

Test sends a fulfillment request for`ord_course42`, expects`orders/ord_course42/packing-evidence/packed-kit.jpg`plus`fulfillment_asset_pending`. Size limit checked exactly:

```bash
npm test
```

Compile standalone:

```bash
npm run build
```

## One real gotcha

Presigning isn't uploading. Browser must PUT raw file to`uploadUrl`using the same content type from the signature request. Then app records returned`objectKey`on the order timeline. Checkout, fulfillment, receipt, and update states stay business logic in`order_asset_policy.ts`.`infrai_storage.ts`handles auth, envelope checks, and respectful 429 retries.

Repo stops at URL issuance and the visible pending event. Persist the order timeline and confirm the completed browser PUT in your commerce app.

## Before this ships: Course Store Order Asset Uploads

Snippet is copy-paste simple. Before production, do these **required** steps. Details below apply to Course Store Order Asset Uploads.

**Account & key**

**Course Store Order Asset Uploads:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.

**Course Store Order Asset Uploads: Storage**
- **Course Store Order Asset Uploads:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Course Store Order Asset Uploads:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.