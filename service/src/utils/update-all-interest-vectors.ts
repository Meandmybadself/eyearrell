import { prisma } from '../lib/prisma.js';
import { updatePersonInterestVector } from './vector-helpers.js';

/**
 * Updates interest vectors for all persons in the database
 * This populates the interest_vector column from person_interests data
 */
export const updateAllInterestVectors = async () => {
  console.log('Starting interest vector update for all persons...');

  // Get all non-deleted persons
  const persons = await prisma.person.findMany({
    where: { deleted: false },
    select: { id: true, displayId: true }
  });

  console.log(`Found ${persons.length} persons to update`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const person of persons) {
    try {
      // Check if person has any interests
      const interestCount = await prisma.personInterest.count({
        where: { personId: person.id }
      });

      if (interestCount > 0) {
        await updatePersonInterestVector(person.id);
        updated++;
        console.log(`Updated interest vector for ${person.displayId} (${interestCount} interests)`);
      } else {
        skipped++;
        console.log(`Skipped ${person.displayId} (no interests)`);
      }
    } catch (error) {
      errors++;
      console.error(`Error updating ${person.displayId}:`, error);
    }
  }

  console.log(`\nInterest vector update complete:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (no interests): ${skipped}`);
  console.log(`  Errors: ${errors}`);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateAllInterestVectors()
    .then(() => {
      console.log('Update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Update failed:', error);
      process.exit(1);
    });
}
