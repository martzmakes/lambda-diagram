import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import {
  EventHandler,
  initEventHandler,
} from "@martzmakes/constructs/lambda/handlers/initEventHandler";
import { uploadImageToS3AndGetPresignedUrl} from "@martzmakes/constructs/lambda/helpers/s3";

const mermaidToImageBuffer = async ({
  title,
  mermaidCode,
}: {
  title: string;
  mermaidCode: string;
}): Promise<Buffer> => {
  // HTML template to render the Mermaid diagram
  const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
          <style>
              body {
                  margin: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: white;
              }
          </style>
      </head>
      <body>
          <div id="mermaidContainer">
              <div class="mermaid">${mermaidCode}</div>
          </div>
          <script>
              mermaid.initialize({ startOnLoad: true });
          </script>
      </body>
      </html>
  `;

  // Launch Puppeteer
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = true;
  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 3,
    },
    executablePath: await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar"
    ),
    headless: false,
  });
  const page = await browser.newPage();

  // Set content
  await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

  // Wait for the diagram to render
  await page.waitForSelector(".mermaid > svg");

  // Select the SVG element and capture as an image
  const element = await page.$(".mermaid > svg");
  if (!element) {
    throw new Error("Failed to render Mermaid diagram");
  }

  // Scale bounding box dimensions by the deviceScaleFactor
  const buffer = await element.screenshot({
    type: "png",
  });

  await browser.close();
  return Buffer.from(buffer);
};

const eventHandler: EventHandler<{
  title: string;
  mermaidCode: string;
}> = async ({ data }) => {
  const { title, mermaidCode } = data;
  const buffer = await mermaidToImageBuffer({
    title,
    mermaidCode,
  });

  const key = `${Date.now()}-${title}.png`;
  const presignedUrl = await uploadImageToS3AndGetPresignedUrl(key, buffer);
  console.log(JSON.stringify({ presignedUrl }));
};

export const handler = initEventHandler({ eventHandler });
