import { PrismaClient } from '@prisma/client';
import { seedNutritionCatalog } from '../lib/nutrition/server/catalog';

/**
 * Ingredients, recipes and the four rotation weeks for the Ernährung mode. Only touches the
 * catalog (upsert by slug) – safe to run as often as you like, user data stays as it is.
 */
const prisma = new PrismaClient();

seedNutritionCatalog(prisma)
  .then((counts) => console.log(`🥗 Ernährung: ${counts.ingredients} Zutaten, ${counts.recipes} Rezepte, ${counts.templates} Rotationswochen`))
  .catch((error) => {
    console.error('Error during nutrition seed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
