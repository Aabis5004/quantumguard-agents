// Simple JSON-file storage for scanned reports
// (No database needed for hackathon — we use a single JSON file)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { FullReport } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const REPORTS_FILE = join(DATA_DIR, "reports.json");

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(REPORTS_FILE)) writeFileSync(REPORTS_FILE, "{}");

type ReportsDB = Record<string, FullReport>;

function load(): ReportsDB {
  try {
    return JSON.parse(readFileSync(REPORTS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function save(db: ReportsDB) {
  writeFileSync(REPORTS_FILE, JSON.stringify(db, null, 2));
}

export function saveReport(report: FullReport) {
  const db = load();
  db[report.contractAddress.toLowerCase()] = report;
  save(db);
}

export function getReport(address: string): FullReport | null {
  const db = load();
  return db[address.toLowerCase()] || null;
}

export function listReports(): FullReport[] {
  const db = load();
  return Object.values(db).sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  );
}
