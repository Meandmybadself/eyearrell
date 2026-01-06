import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';

// First names pool
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia',
  'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael',
  'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'Jackson', 'Avery',
  'Sebastian', 'Ella', 'David', 'Scarlett', 'Joseph', 'Grace', 'Carter',
  'Chloe', 'Owen', 'Victoria', 'Wyatt', 'Riley', 'John', 'Aria', 'Jack',
  'Lily', 'Luke', 'Aubrey', 'Jayden', 'Zoey', 'Dylan', 'Penelope', 'Grayson',
  'Lillian', 'Levi', 'Addison', 'Isaac', 'Layla', 'Gabriel', 'Natalie', 'Julian'
];

// Last names pool
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
  'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts'
];

// Helper to generate a random element from an array
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a random number between min and max (inclusive)
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate a random decimal between 0 and 1
const randomLevel = (): number => Math.random();

// Helper to generate a random phone number
const generatePhoneNumber = (): string => {
  const areaCodes = ['212', '312', '415', '617', '202', '305', '404', '512', '602', '713'];
  const areaCode = randomElement(areaCodes);
  const exchange = randomInt(200, 999);
  const line = randomInt(1000, 9999);
  return `(${areaCode}) ${exchange}-${line}`;
};

// Helper to generate a random personal email
const generatePersonalEmail = (firstName: string, lastName: string): string => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const separators = ['.', '_', ''];
  const addNumbers = Math.random() > 0.5;

  const separator = randomElement(separators);
  const domain = randomElement(domains);
  const number = addNumbers ? randomInt(1, 999) : '';

  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${number}@${domain}`;
};

// Helper to generate random privacy level (80% public, 20% private)
const randomPrivacy = (): 'PUBLIC' | 'PRIVATE' => {
  return Math.random() > 0.2 ? 'PUBLIC' : 'PRIVATE';
};

// Helper to create a URL-safe displayId
const createDisplayId = (firstName: string, lastName: string, counter: number): string => {
  const base = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  return counter > 0 ? `${base}-${counter}` : base;
};

// Helper to check if displayId exists
const displayIdExists = async (displayId: string): Promise<boolean> => {
  const existing = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });
  return !!existing;
};

// Helper to generate a unique displayId
const generateUniqueDisplayId = async (firstName: string, lastName: string): Promise<string> => {
  let counter = 0;
  let displayId = createDisplayId(firstName, lastName, counter);

  while (await displayIdExists(displayId)) {
    counter++;
    displayId = createDisplayId(firstName, lastName, counter);
  }

  return displayId;
};

export const seedTestUsers = async () => {
  console.log('Starting test users seed...');

  // Get all available interests
  const allInterests = await prisma.interest.findMany({
    where: { deleted: false }
  });

  if (allInterests.length === 0) {
    console.log('No interests found. Please run seed-interests.ts first.');
    return;
  }

  console.log(`Found ${allInterests.length} interests to assign from.`);

  const numberOfUsers = randomInt(50, 60);
  console.log(`Creating ${numberOfUsers} test users...`);

  // Decide how many couples to create (about 20-30% of users)
  const numberOfCouples = Math.floor(numberOfUsers * 0.25);
  const spouseLastNames: string[] = [];

  // Generate some common last names for couples
  for (let i = 0; i < numberOfCouples; i++) {
    spouseLastNames.push(randomElement(lastNames));
  }

  const saltRounds = 12;
  const defaultPassword = await bcrypt.hash('password123', saltRounds);

  let created = 0;
  let errors = 0;

  for (let i = 0; i < numberOfUsers; i++) {
    try {
      const firstName = randomElement(firstNames);
      let lastName: string;

      // Assign spouse last names to create couples
      if (i < spouseLastNames.length * 2 && spouseLastNames.length > 0) {
        const coupleIndex = Math.floor(i / 2);
        lastName = spouseLastNames[coupleIndex];
      } else {
        lastName = randomElement(lastNames);
      }

      // Generate unique email
      const emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}`;
      const email = `${emailPrefix}@test.fart`;

      // Check if email already exists
      const existingUser = await prisma.user.findFirst({
        where: { email, deleted: false }
      });

      if (existingUser) {
        console.log(`User with email ${email} already exists, skipping...`);
        continue;
      }

      // Generate unique displayId
      const displayId = await generateUniqueDisplayId(firstName, lastName);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: defaultPassword,
          verificationToken: null, // Mark as verified
          isSystemAdmin: false
        }
      });

      // Create person
      const person = await prisma.person.create({
        data: {
          firstName,
          lastName,
          displayId,
          userId: user.id
        }
      });

      // Assign random interests (between 3 and 15 interests per person)
      const numberOfInterests = randomInt(3, 15);
      const selectedInterests = new Set<number>();

      while (selectedInterests.size < numberOfInterests) {
        const randomInterest = randomElement(allInterests);
        selectedInterests.add(randomInterest.id);
      }

      // Create person interests
      for (const interestId of selectedInterests) {
        await prisma.personInterest.create({
          data: {
            personId: person.id,
            interestId,
            level: randomLevel()
          }
        });
      }

      // Create contact information (80% chance of having contact info)
      const contactInfoCount = [];
      if (Math.random() > 0.2) {
        // Add phone number (70% chance)
        if (Math.random() > 0.3) {
          const phoneContact = await prisma.contactInformation.create({
            data: {
              type: 'PHONE',
              label: randomElement(['Mobile', 'Cell', 'Personal']),
              value: generatePhoneNumber(),
              privacy: randomPrivacy()
            }
          });

          await prisma.personContactInformation.create({
            data: {
              personId: person.id,
              contactInformationId: phoneContact.id
            }
          });
          contactInfoCount.push('phone');
        }

        // Add personal email (60% chance)
        if (Math.random() > 0.4) {
          const emailContact = await prisma.contactInformation.create({
            data: {
              type: 'EMAIL',
              label: randomElement(['Personal', 'Home', 'Work']),
              value: generatePersonalEmail(firstName, lastName),
              privacy: randomPrivacy()
            }
          });

          await prisma.personContactInformation.create({
            data: {
              personId: person.id,
              contactInformationId: emailContact.id
            }
          });
          contactInfoCount.push('email');
        }
      }

      created++;
      const contactInfo = contactInfoCount.length > 0 ? ` with ${contactInfoCount.join(' & ')}` : '';
      console.log(`Created user ${email} with person ${displayId}, ${numberOfInterests} interests${contactInfo}`);
    } catch (error) {
      errors++;
      console.error(`Error creating user ${i + 1}:`, error);
    }
  }

  console.log(`\nTest users seed complete: ${created} users created, ${errors} errors`);
  console.log(`Created approximately ${numberOfCouples} couples with shared last names`);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestUsers()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
