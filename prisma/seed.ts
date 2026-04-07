import prisma from "../src/lib/db";

const catalog = [
  {
    name: "Burgers",
    products: [
      { name: "Classic Burger", price: 12.0 },
      { name: "Cheese Burger", price: 13.5 },
      { name: "Double Burger", price: 16.9 },
    ],
  },
  {
    name: "Boissons",
    products: [
      { name: "Coca-Cola 33cl", price: 3.5 },
      { name: "Eau 50cl", price: 2.0 },
      { name: "Jus d'orange", price: 4.0 },
    ],
  },
];

async function main() {
  console.log("🌱 Start seeding...");

  for (const category of catalog) {
    const savedCategory = await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: { name: category.name },
    });

    console.log(`  Category: ${savedCategory.name}`);

    await Promise.all(
      category.products.map((product) =>
        prisma.product.upsert({
          where: {
            name_categoryId: {
              name: product.name,
              categoryId: savedCategory.id,
            },
          },
          update: {
            price: product.price,
            isActive: true,
          },
          create: {
            name: product.name,
            price: product.price,
            categoryId: savedCategory.id,
          },
        }),
      ),
    );
  }
}

main()
  .then(async () => {
    console.log("✅ Seeding finished.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
