import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  await p.business.createMany({ data: [
    { name: "Örnek Kafe", category: "Kafe", phone: "0286 000 00 00", priceInfo: "Çay 15 TL", hasToilet: true, opensAt: "08:00", closesAt: "23:00" },
    { name: "Örnek Kırtasiye", category: "Kırtasiye", priceInfo: "Fotokopi 1 TL", hasToilet: false, opensAt: "09:00", closesAt: "19:00" },
  ]});
}
main().finally(() => p.$disconnect());
