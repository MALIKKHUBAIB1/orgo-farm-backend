import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ImageKit } from "@imagekit/nodejs";

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const FILES = [
  "../public/orgo/face-pack.jpg",
  "../public/orgo/lemon-bar.jpg",
  "../public/orgo/rose-bar.jpg",
  "../public/orgo/bars-packaged.jpg",
  "../public/orgo/collection.jpg",
  "../public/orgo/how-to-use.jpg",
  "../public/orgo/lid.jpg",
  "../public/orgo/logo.jpg",
  "../public/orgo/curation-card.jpg",
  "../public/orgo/curation-tiers.jpg",
];

const map = {};
for (const rel of FILES) {
  const abs = path.resolve(rel);
  const fileName = path.basename(abs);
  const base64 = fs.readFileSync(abs).toString("base64");
  const res = await imageKit.files.upload({
    file: base64,
    fileName,
    folder: "/orgo",
    useUniqueFileName: false,
    overwriteFile: true,
  });
  map[rel.replace("../public/", "public/")] = res.url;
  console.log(`${rel} -> ${res.url}`);
}

fs.writeFileSync("/tmp/opencode/ik-map.json", JSON.stringify(map, null, 2));
console.log("MAP SAVED");