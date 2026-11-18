import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { MAX_UPLOAD_BYTES, imageDir, isImageName, saveUploadedImage, sniffImage } from "../src/lib/product";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

test("a picture is known by its bytes", () => {
  assert.equal(sniffImage(JPEG), "jpg");
  assert.equal(sniffImage(PNG), "png");
  assert.equal(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1")), "webp");
  assert.equal(sniffImage(Buffer.from("GIF89a....", "latin1")), "gif");
});

test("what is not a raster picture is refused, whatever it is called", () => {
  for (const fake of ['<svg xmlns="http://www.w3.org/2000/svg"/>', "<html><script>", "%PDF-1.7", ""]) {
    assert.equal(sniffImage(Buffer.from(fake)), null, fake);
  }
});

test("an upload is stored under a fresh name the image route accepts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onske-upload-"));
  const name = saveUploadedImage(JPEG, dir);
  assert.ok(name && isImageName(name) && name.endsWith(".jpg"));
  assert.deepEqual(fs.readFileSync(path.join(imageDir(dir), name)), JPEG);
  assert.equal(saveUploadedImage(Buffer.from("<svg/>"), dir), null);
  assert.equal(saveUploadedImage(Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_BYTES)]), dir), null);
  assert.equal(fs.readdirSync(imageDir(dir)).length, 1);
});
