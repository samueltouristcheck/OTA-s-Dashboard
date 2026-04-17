import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

import { ensureLoginEventTable } from "../src/lib/ensure-loginevent";
import { prisma } from "../src/lib/prisma";

async function main() {
  const r = await ensureLoginEventTable();
  await prisma.$disconnect();
  if (!r.ok) {
    console.error("Error:", r.message);
    process.exit(1);
  }
  console.log("Tabla LoginEvent lista.");
  process.exit(0);
}

main();
