import { prisma } from '../lib/prisma.js';
import { AchievementCategory } from '@prisma/client';

interface AchievementData {
  key: string;
  name: string;
  description: string;
  points: number;
  category: AchievementCategory;
  iconName?: string;
  actionUrl?: string;
  sortOrder: number;
}

interface LevelData {
  levelNumber: number;
  name: string;
  pointsRequired: number;
  description: string;
  iconName?: string;
}

const achievementsData: AchievementData[] = [
  // ONBOARDING Category
  {
    key: 'email_verified',
    name: 'Email Verified',
    description: 'Verify your email address',
    points: 10,
    category: 'ONBOARDING',
    iconName: 'envelope-check',
    actionUrl: '/profile',
    sortOrder: 1
  },
  {
    key: 'first_person_created',
    name: 'Welcome to the Community',
    description: 'Create your first person profile',
    points: 20,
    category: 'ONBOARDING',
    iconName: 'user-plus',
    actionUrl: '/persons/create',
    sortOrder: 2
  },

  // PROFILE Category
  {
    key: 'profile_basics',
    name: 'Getting Started',
    description: 'Add name and pronouns to your profile',
    points: 15,
    category: 'PROFILE',
    iconName: 'user-edit',
    actionUrl: '/persons/me',
    sortOrder: 3
  },
  {
    key: 'profile_photo',
    name: 'Show Your Face',
    description: 'Upload a profile photo',
    points: 15,
    category: 'PROFILE',
    iconName: 'camera',
    actionUrl: '/persons/me',
    sortOrder: 4
  },
  {
    key: 'first_interest',
    name: 'Share Your Passions',
    description: 'Add your first interest',
    points: 10,
    category: 'PROFILE',
    iconName: 'heart',
    actionUrl: '/persons/me',
    sortOrder: 5
  },
  {
    key: 'interests_complete',
    name: 'Well Rounded',
    description: 'Add at least 5 interests to your profile',
    points: 25,
    category: 'PROFILE',
    iconName: 'stars',
    actionUrl: '/persons/me',
    sortOrder: 6
  },
  {
    key: 'profile_complete',
    name: 'Profile Master',
    description: 'Complete all profile fields (name, pronouns, photo, 3+ contact info, 5+ interests)',
    points: 50,
    category: 'PROFILE',
    iconName: 'trophy',
    actionUrl: '/persons/me',
    sortOrder: 7
  },

  // PRIVACY Category (CRITICAL FOR EDUCATION)
  {
    key: 'first_private_address',
    name: 'Privacy Aware',
    description: 'Add your first PRIVATE address to enable nearby discovery while keeping your location confidential',
    points: 30,
    category: 'PRIVACY',
    iconName: 'shield-check',
    actionUrl: '/persons/me',
    sortOrder: 8
  },
  {
    key: 'privacy_explorer',
    name: 'Privacy Pro',
    description: 'Set at least one contact to private and one to public',
    points: 20,
    category: 'PRIVACY',
    iconName: 'lock-open',
    actionUrl: '/persons/me',
    sortOrder: 9
  },

  // DISCOVERY Category
  {
    key: 'nearby_discovery',
    name: 'Local Explorer',
    description: 'View the nearby persons/groups feature',
    points: 25,
    category: 'DISCOVERY',
    iconName: 'map-pin',
    actionUrl: '/persons',
    sortOrder: 10
  },
  {
    key: 'first_similar_person',
    name: 'Finding Your People',
    description: 'Discover someone with similar interests (>25% match)',
    points: 15,
    category: 'DISCOVERY',
    iconName: 'users',
    actionUrl: '/persons',
    sortOrder: 11
  },

  // SOCIAL Category
  {
    key: 'first_group_join',
    name: 'Group Member',
    description: 'Join your first group',
    points: 25,
    category: 'SOCIAL',
    iconName: 'user-group',
    actionUrl: '/groups',
    sortOrder: 12
  },
  {
    key: 'first_group_create',
    name: 'Community Builder',
    description: 'Create your first group',
    points: 40,
    category: 'SOCIAL',
    iconName: 'building',
    actionUrl: '/groups/create',
    sortOrder: 13
  },
  {
    key: 'group_admin',
    name: 'Leadership',
    description: 'Become an admin of a group',
    points: 30,
    category: 'SOCIAL',
    iconName: 'crown',
    actionUrl: '/groups',
    sortOrder: 14
  },

  // ENGAGEMENT Category
  {
    key: 'contact_sharer',
    name: 'Connector',
    description: 'Add at least 3 different types of contact information',
    points: 15,
    category: 'ENGAGEMENT',
    iconName: 'address-card',
    actionUrl: '/persons/me',
    sortOrder: 15
  },
  {
    key: 'active_member',
    name: 'Regular',
    description: 'Complete profile + join 2+ groups + 5+ interests',
    points: 35,
    category: 'ENGAGEMENT',
    iconName: 'star',
    actionUrl: '/persons/me',
    sortOrder: 16
  }
];

const levelsData: LevelData[] = [
  {
    levelNumber: 1,
    name: 'Newcomer',
    pointsRequired: 0,
    description: 'Just getting started on your community journey',
    iconName: 'seedling'
  },
  {
    levelNumber: 2,
    name: 'Explorer',
    pointsRequired: 50,
    description: 'Learning the ropes and exploring features',
    iconName: 'compass'
  },
  {
    levelNumber: 3,
    name: 'Community Member',
    pointsRequired: 100,
    description: 'Active participant in the community',
    iconName: 'user'
  },
  {
    levelNumber: 4,
    name: 'Contributor',
    pointsRequired: 200,
    description: 'Making meaningful connections',
    iconName: 'handshake'
  },
  {
    levelNumber: 5,
    name: 'Connector',
    pointsRequired: 350,
    description: 'Well-integrated community member',
    iconName: 'network'
  },
  {
    levelNumber: 6,
    name: 'Community Leader',
    pointsRequired: 500,
    description: 'Inspiring and guiding others',
    iconName: 'medal'
  }
];

export const seedGamification = async () => {
  console.log('Starting gamification seed...');

  // Seed Achievements (upsert to update existing with new fields like actionUrl)
  let achievementsCreated = 0;
  let achievementsUpdated = 0;

  for (const achievementData of achievementsData) {
    const existing = await prisma.achievement.findUnique({
      where: { key: achievementData.key }
    });

    if (!existing) {
      await prisma.achievement.create({
        data: achievementData
      });
      achievementsCreated++;
    } else {
      // Update existing achievement with new data (preserves user completions)
      await prisma.achievement.update({
        where: { key: achievementData.key },
        data: {
          name: achievementData.name,
          description: achievementData.description,
          points: achievementData.points,
          category: achievementData.category,
          iconName: achievementData.iconName,
          actionUrl: achievementData.actionUrl,
          sortOrder: achievementData.sortOrder
        }
      });
      achievementsUpdated++;
    }
  }

  console.log(`Achievements seed: ${achievementsCreated} created, ${achievementsUpdated} updated`);

  // Seed Levels
  let levelsCreated = 0;
  let levelsSkipped = 0;

  for (const levelData of levelsData) {
    const existing = await prisma.level.findUnique({
      where: { levelNumber: levelData.levelNumber }
    });

    if (!existing) {
      await prisma.level.create({
        data: levelData
      });
      levelsCreated++;
    } else {
      levelsSkipped++;
    }
  }

  console.log(`Levels seed: ${levelsCreated} created, ${levelsSkipped} skipped`);
  console.log('Gamification seed complete!');
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGamification()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
