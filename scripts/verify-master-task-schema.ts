import { prisma } from "../src/lib/db";

async function main() {
  try {
    console.log("Fetching master tasks...");
    const tasks = await prisma.masterTask.findMany();
    console.log(`Successfully fetched ${tasks.length} master tasks.`);
    if (tasks.length > 0) {
      console.log("First task sample:", tasks[0]);
    }
  } catch (error) {
    console.error("Error fetching master tasks:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
