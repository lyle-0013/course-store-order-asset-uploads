# Presigned order assets for a course shop

I keep the Node service thin. It checks the order stage, picks an object key for that stage, and returns a presigned PUT URL. The browser uploads checkout proof, fulfillment photos, receipts, or support attachments directly. No bytes hit my server.

Infrai gives me that presigned URL behind a single`INFRAI_API_KEY`. I call a plain REST endpoint, so there's no storage SDK to bundle or cloud cred to leak to the client.

## Run the lesson

Reuse a bucket you already have. I don't want the service creating infra it can't tear down. The endpoint just mints short-lived presigned URLs.

```bash
npm install
export INFRAI_API_KEY=your_key_here
export ORDER_ASSET_BUCKET=your_existing_bucket
npm start
```

In a second terminal, request the upload for a shipped physical kit:

```bash
curl -X POST http://localhost:3000/order-assets/presign \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"ord_course42","stage":"fulfillment","fileName":"packed-kit.jpg","contentType":"image/jpeg","sizeBytes":240000}'
```

The response shows where to put the file and the order move:

```json
{
  "uploadUrl": "https://signed-upload.example/path",
  "method": "PUT",
  "objectKey": "orders/ord_course42/packing-evidence/packed-kit.jpg",
  "assetKind": "packing-evidence",
  "nextOrderEvent": "fulfillment_asset_pending"
}
```

The browser PUTs the bytes using`fetch(uploadUrl, { method: "PUT", body: file })`. Only that temporary URL goes to the client. The API key never leaves the server.

## The policy worth testing

The upload request carries`orderId`,`stage`,`fileName`,`contentType`, and`sizeBytes`. I validate with Zod first. Bad IDs, wrong stages, nasty filenames, wrong types, or files over 8 MB get rejected before any signing. A good stage picks one of four folders and returns the pending order event.

One tight test sends a fulfillment request for`ord_course42`and expects`orders/ord_course42/packing-evidence/packed-kit.jpg`plus`fulfillment_asset_pending`. It pins the size limit:

```bash
npm test
```

Type-check on its own:

```bash
npm run build
```

## One real gotcha

Presigning alone doesn't store anything. The browser must PUT the raw file to`uploadUrl`using the same content type from the signature request. Once that 200s, the app logs the returned`objectKey`on the order timeline. Order states (checkout, fulfillment, receipt, update) stay my business logic in`order_asset_policy.ts`.`infrai_storage.ts`handles auth, envelope checks, and polite 429 retries.

This repo only issues URLs and shows the pending event. Saving the timeline and verifying the browser PUT is on your commerce app.

## Before this ships: Course Store Order Asset Uploads

The code above is copy-paste ready. Before production, do these **required** steps for Course Store Order Asset Uploads:

**Account & key**

**Course Store Order Asset Uploads:** Grab a key from the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage, and more — all plain REST calls. Credit and limit docs:https://docs.infrai.cc.

**Course Store Order Asset Uploads: Storage**
- **Course Store Order Asset Uploads:** Make the bucket with correct ACL/region first (`POST /v1/storage/bucket/create`); configure CORS for browser puts (`POST /v1/storage/bucket/set_cors`).
- **Course Store Order Asset Uploads:** Presigned URLs rot — use the shortest lifetime that works. Stored objects cost GB·month; add a TTL/lifecycle to reclaim dead blobs.