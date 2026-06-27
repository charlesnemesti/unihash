import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:5173';
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/images/molecules');

const MOLECULES = [
  { name: 'Ethanol', slug: 'ethanol' },
  { name: 'Aspirin', slug: 'aspirin' },
  { name: 'Caffeine', slug: 'caffeine' },
  { name: 'Nicotine', slug: 'nicotine' },
  { name: 'LSD', slug: 'lsd' },
  { name: 'Cocaine', slug: 'cocaine' },
  { name: 'Cholesterol', slug: 'cholesterol' },
  { name: 'Glucose', slug: 'glucose' },
  { name: 'Cubane', slug: 'cubane' },
  { name: 'Buckyball', slug: 'buckyball' },
];

async function ensureDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function run() {
  await ensureDir();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 760, height: 760 },
    deviceScaleFactor: 2,
  });

  for (let i = 0; i < MOLECULES.length; i += 1) {
    const molecule = MOLECULES[i];
    const url = `${BASE_URL}/capture-molecules.html?i=${i}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__captureReady === true);

    const stage = page.locator('#capture-stage');
    await stage.screenshot({
      path: path.join(OUTPUT_DIR, `${molecule.slug}.png`),
      omitBackground: false,
    });
  }

  await browser.close();
  console.log(`Exported ${MOLECULES.length} molecule PNG files to ${OUTPUT_DIR}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
