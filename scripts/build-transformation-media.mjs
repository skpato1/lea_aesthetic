import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDirectory = process.argv[2];
const output = process.argv[3] || "src/content/transformation-media.json";

if (!sourceDirectory) {
  throw new Error(
    "Usage: node scripts/build-transformation-media.mjs <dossier-source> [fichier-json]",
  );
}

const createdAt = Date.UTC(2026, 8, 22, 16, 5, 43);
const files = {
  hairBefore: "WhatsApp Image 2026-09-22 at 18.05.43 (1).jpeg",
  faceThreeQuarter: "WhatsApp Image 2026-09-22 at 18.05.43 (2).jpeg",
  faceProfile: "WhatsApp Image 2026-09-22 at 18.05.43 (3).jpeg",
  hairAfter: "WhatsApp Image 2026-09-22 at 18.05.43.jpeg",
};

const specs = [
  {
    id: "61a944f0-6d7a-4e24-9c0b-3bfe799ec101",
    name: "Greffe capillaire — avant.webp",
    file: files.hairBefore,
    crop: "hair",
  },
  {
    id: "61a944f0-6d7a-4e24-9c0b-3bfe799ec102",
    name: "Greffe capillaire — après.webp",
    file: files.hairAfter,
    crop: "hair",
  },
  {
    id: "61a944f0-6d7a-4e24-9c0b-3bfe799ec201",
    name: "Lifting tiers moyen trois quarts — avant.webp",
    file: files.faceThreeQuarter,
    crop: "left",
  },
  {
    id: "61a944f0-6d7a-4e24-9c0b-3bfe799ec202",
    name: "Lifting tiers moyen trois quarts — après.webp",
    file: files.faceThreeQuarter,
    crop: "right",
  },
  {
    id: "61a944f0-6d7a-4e24-9c0b-3bfe799ec301",
    name: "Lifting tiers moyen profil — avant.webp",
    file: files.faceProfile,
    crop: "left",
  },
  {
    id: "61a944f0-6d7a-4e24-9c0b-3bfe799ec302",
    name: "Lifting tiers moyen profil — après.webp",
    file: files.faceProfile,
    crop: "right",
  },
];

async function render(spec) {
  const source = path.join(sourceDirectory, spec.file);
  const input = sharp(source).rotate();
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height)
    throw new Error(`Image invalide: ${source}`);

  let region;
  if (spec.crop === "hair") {
    region = {
      left: Math.round(metadata.width * 0.21),
      top: Math.round(metadata.height * 0.24),
      width: Math.round(metadata.width * 0.58),
      height: Math.round(metadata.height * 0.57),
    };
  } else {
    const half = Math.floor(metadata.width / 2);
    const centerTrim = 14;
    const top = Math.round(metadata.height * 0.045);
    region = {
      left: spec.crop === "left" ? 0 : metadata.width - half + centerTrim,
      top,
      width: half - centerTrim,
      height: Math.round(metadata.height * 0.88),
    };
  }

  const result = await input
    .extract(region)
    .resize({
      width: 1100,
      height: 1500,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 88, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  return {
    id: spec.id,
    name: spec.name,
    width: result.info.width,
    height: result.info.height,
    created_at: createdAt,
    url: `/media/${spec.id}`,
    body: result.data.toString("base64"),
  };
}

const media = [];
for (const spec of specs) media.push(await render(spec));
await fs.writeFile(output, `${JSON.stringify(media)}\n`);
console.log(
  media
    .map(({ name, width, height }) => `${name}: ${width} × ${height}`)
    .join("\n"),
);
