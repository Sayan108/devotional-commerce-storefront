import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const mark = await readFile(new URL("../public/brand-emblem.png", import.meta.url));
const source = "data:image/png;base64," + mark.toString("base64");
const ricePaper = "#FAF6ED";

function artwork(size, width, background) {
  const height = width * 494 / 640;
  const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}
    <image href="${source}" x="${(size - width) / 2}" y="${(size - height) / 2}"
      width="${width}" height="${height}"/>
  </svg>`;
  return new Resvg(canvas).render().asPng();
}

await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
await writeFile(new URL("../assets/icon.png", import.meta.url), artwork(1024, 614));
await writeFile(new URL("../assets/splash.png", import.meta.url), artwork(2732, 614, ricePaper));
await writeFile(new URL("../public/favicon.png", import.meta.url), artwork(192, 116, ricePaper));
