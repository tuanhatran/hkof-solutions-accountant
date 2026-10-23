import { defineConfig } from "cypress";
import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { openPromise, type Entry, type ZipFile } from "yauzl";

const ROOT = process.cwd();
const DOWNLOADS_DIR = path.resolve(ROOT, "cypress/downloads");

function resolvePath(relativePath: string): string {
  const absolutePath = path.resolve(ROOT, relativePath);
  if (!absolutePath.startsWith(ROOT + path.sep)) {
    throw new Error(`Path outside the project rejected: ${relativePath}`);
  }
  return absolutePath;
}

async function waitForDownload(
  name: string,
  timeoutMs = 30_000,
): Promise<string> {
  if (name.includes("/") || name.includes("\\")) {
    throw new Error(`Expected a file name without a directory: ${name}`);
  }
  const target = path.join(DOWNLOADS_DIR, name);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const stats = await fs.stat(target);
      if (stats.isFile() && stats.size > 0) {
        return target;
      }
    } catch {
      // The download has not started yet or is still being written.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Download missing after ${timeoutMs} ms: ${name}`);
}

async function pdfText(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

async function zipEntryText(zipFile: ZipFile, entry: Entry): Promise<string> {
  const stream = await zipFile.openReadStreamPromise(entry);
  const data = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
  return entry.fileName.toLowerCase().endsWith(".pdf")
    ? pdfText(data)
    : data.toString("utf8");
}

async function readZipEntries(filePath: string): Promise<Record<string, string>> {
  const absolutePath = filePath.startsWith(ROOT)
    ? filePath
    : resolvePath(filePath);
  const zipFile = await openPromise(absolutePath, { lazyEntries: true });
  const entries: Record<string, string> = {};
  await new Promise<void>((resolve, reject) => {
    zipFile.on("error", reject);
    zipFile.on("end", resolve);
    zipFile.on("entry", (entry: Entry) => {
      if (entry.fileName.endsWith("/")) {
        zipFile.readEntry();
        return;
      }
      zipEntryText(zipFile, entry)
        .then((text) => {
          entries[entry.fileName] = text;
          zipFile.readEntry();
        })
        .catch(reject);
    });
    zipFile.readEntry();
  });
  return entries;
}

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    downloadsFolder: "cypress/downloads",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",
    video: false,
    viewportWidth: 1440,
    viewportHeight: 1000,
    defaultCommandTimeout: 12_000,
    requestTimeout: 20_000,
    responseTimeout: 30_000,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on) {
      on("task", {
        async readPdf(filePath: string): Promise<string> {
          const absolutePath = filePath.startsWith(ROOT)
            ? filePath
            : resolvePath(filePath);
          return pdfText(await fs.readFile(absolutePath));
        },
        async readZipText(filePath: string): Promise<Record<string, string>> {
          return readZipEntries(filePath);
        },
        async fileSize(filePath: string): Promise<number> {
          const absolutePath = filePath.startsWith(ROOT)
            ? filePath
            : resolvePath(filePath);
          const stats = await fs.stat(absolutePath);
          return stats.size;
        },
        async waitForDownload(name: string): Promise<string> {
          return waitForDownload(name);
        },
        async clearDownloads(): Promise<number> {
          await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
          const entries = await fs.readdir(DOWNLOADS_DIR);
          let removed = 0;
          for (const entry of entries) {
            const target = path.join(DOWNLOADS_DIR, entry);
            const stats = await fs.stat(target);
            if (stats.isFile()) {
              await fs.unlink(target);
              removed += 1;
            }
          }
          return removed;
        },
        async deleteFile(filePath: string): Promise<boolean> {
          try {
            await fs.unlink(resolvePath(filePath));
            return true;
          } catch {
            return false;
          }
        },
        async createLargeFile(filePath: string): Promise<string> {
          const absolutePath = resolvePath(filePath);
          await fs.mkdir(path.dirname(absolutePath), { recursive: true });
          const content = Buffer.alloc(11 * 1024 * 1024, "a");
          await fs.writeFile(absolutePath, content);
          return absolutePath;
        },
      });
    },
  },
});
