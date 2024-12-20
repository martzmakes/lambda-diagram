import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import {
  EventHandler,
  initEventHandler,
} from "@martzmakes/constructs/lambda/handlers/initEventHandler";
import { uploadImageToS3AndGetPresignedUrl } from "@martzmakes/constructs/lambda/helpers/s3";

const drawioToImageBuffer = async ({
  drawioXml,
}: {
  drawioXml: string;
}): Promise<Buffer> => {
  // Launch Puppeteer
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = true;
  const width = 2 * 1920;
  const height = 2 * 1080;
  const browser = await puppeteer.launch({
    args: [...chromium.args],
    defaultViewport: {
      width,
      height,
      deviceScaleFactor: 3,
    },
    executablePath: await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar"
    ),
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://www.draw.io/export3.html", {
    waitUntil: "networkidle0",
  });

  await page.evaluate(
    (obj) => {
      return (window as any).render({
        h: obj.height,
        w: obj.width,
        xml: obj.drawioXml,
      });
    },
    { drawioXml, width, height }
  );
  await page.waitForSelector("#LoadingComplete");
  console.log("Loading complete");

  // Select the SVG element and capture as an image
  const element = await page.$("#graph > svg");
  if (!element) {
    throw new Error("Failed to render Mermaid diagram");
  }

  // Scale bounding box dimensions by the deviceScaleFactor
  const buffer = await element.screenshot({
    type: "png",
    fullPage: true,
  });

  await browser.close();
  return Buffer.from(buffer);
};

const eventHandler: EventHandler<{
  title: string;
  drawioXml: string;
}> = async ({ data }) => {
  const { title, drawioXml } = data;
  const buffer = await drawioToImageBuffer({
    drawioXml,
  });

  const key = `${Date.now()}-${title}.png`;
  const presignedUrl = await uploadImageToS3AndGetPresignedUrl({ key, buffer });
  console.log(JSON.stringify({ presignedUrl }));
};

export const handler = initEventHandler({ eventHandler });
