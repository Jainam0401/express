import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pool });

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// BRAND + CATEGORY inference from name (no schema changes required)
function getBehavior(name: string) {
  if (name.includes("Nike")) return { brandBoost: 1.25, categoryMult: 1.2 };
  if (name.includes("Adidas")) return { brandBoost: 1.2, categoryMult: 1.15 };
  if (name.includes("Puma")) return { brandBoost: 1.1, categoryMult: 1.05 };
  if (name.includes("New Balance")) return { brandBoost: 1.15, categoryMult: 1.1 };
  if (name.includes("Asics")) return { brandBoost: 1.18, categoryMult: 1.25 };

  return { brandBoost: 1, categoryMult: 1 };
}

async function main() {
  console.log("Start seeding...");

  // clear tables
  await prisma.shoeMetric.deleteMany();
  await prisma.shoe.deleteMany();

  // insert shoes (name only, matches schema)
  const shoeNames = [
    "Nike Air Zoom",
    "Adidas Ultraboost",
    "Puma Street Rider",
    "New Balance 990",
    "Asics Gel-Kayano",
  ];

  await prisma.shoe.createMany({
    data: shoeNames.map((name) => ({ name })),
  });

  const shoes = await prisma.shoe.findMany();
  const baseDate = new Date("2025-01-01");

  const data: any[] = [];

  for (let index = 0; index < shoes.length; index++) {
    const shoe = shoes[index];
    const behavior = getBehavior(shoe.name);

    for (let day = 0; day < 30; day++) {
      const seasonal = Math.sin(day / 4) * 0.15 + 1; // soft seasonality
      const noise = 1 + (Math.random() - 0.5) * 0.25; // +-12% noise
      const multiplier = behavior.brandBoost * behavior.categoryMult * seasonal * noise;

      const salesBase = 50 + index * 20 + day * 1.5;
      const impressionsBase = 3000 + index * 500 + day * 120;
      const clicksBase = 80 + index * 15 + day * 4;
      const adCostBase = 1000 + index * 150 + day * 40;

      data.push({
        shoeId: shoe.id,
        sales: Math.floor(salesBase * multiplier),
        advertisingCost: Math.floor(adCostBase * noise),
        impressions: Math.floor(impressionsBase * seasonal * noise),
        clicks: Math.floor(clicksBase * multiplier),
        recordDate: new Date(baseDate.getTime() + day * 86400000),
      });
    }
  }

  await prisma.shoeMetric.createMany({ data });

  console.log("Seeding completed with versatile data.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
