import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const mark = await readFile(new URL("../public/logo.svg", import.meta.url), "utf8");

function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

await mkdir(new URL("../assets/", import.meta.url), { recursive: true });
await writeFile(new URL("../assets/icon.png", import.meta.url), png(mark, 1024));

const nested = mark.replace("<svg ", '<svg x="14" y="14" width="36" height="36" ');
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#faf5eb"/>
  ${nested}
</svg>`;
await writeFile(new URL("../assets/splash.png", import.meta.url), png(splash, 2732));
await writeFile(new URL("../public/favicon.png", import.meta.url), png(mark, 192));
