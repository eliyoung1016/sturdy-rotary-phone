import { prisma } from "@/lib/db";

async function main() {
  console.log("Checking Templates...");
  const templates = await prisma.template.findMany({
    include: {
      templateTasks: true,
    },
  });
  console.log(`Found ${templates.length} templates:`);
  console.log(JSON.stringify(templates, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
