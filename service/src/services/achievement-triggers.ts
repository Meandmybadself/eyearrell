import { prisma } from '../lib/prisma.js';
import { gamificationService } from './gamification-service.js';

/**
 * Achievement Triggers Service
 *
 * This service contains functions to check and award achievements based on user actions.
 * Call these functions after relevant user actions to automatically award achievements.
 */

export class AchievementTriggers {
  /**
   * Check profile-related achievements for a person
   */
  async checkProfileAchievements(personId: number): Promise<string[]> {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        user: true,
        contactInformation: {
          include: {
            contactInformation: true
          }
        },
        interests: {
          include: {
            interest: true
          }
        }
      }
    });

    if (!person) return [];

    const userId = person.userId;
    const achievementsToCheck: string[] = [];

    // Check: Profile basics (name and pronouns)
    if (person.firstName && person.pronouns) {
      achievementsToCheck.push('profile_basics');
    }

    // Check: Profile photo
    if (person.imageURL) {
      achievementsToCheck.push('profile_photo');
    }

    // Filter to only non-deleted relations
    const activeContacts = person.contactInformation.filter(pc => !pc.contactInformation.deleted);
    const activeInterests = person.interests.filter(pi => !pi.interest.deleted);

    // Check: First interest
    if (activeInterests.length >= 1) {
      achievementsToCheck.push('first_interest');
    }

    // Check: 5+ interests
    if (activeInterests.length >= 5) {
      achievementsToCheck.push('interests_complete');
    }

    // Check: Profile complete (name, pronouns, photo, 3+ contact info, 5+ interests)
    const hasBasics = person.firstName && person.pronouns && person.imageURL;
    const hasContacts = activeContacts.length >= 3;
    const hasInterests = activeInterests.length >= 5;
    if (hasBasics && hasContacts && hasInterests) {
      achievementsToCheck.push('profile_complete');
    }

    // Check: Contact sharer (3+ different types of contact info)
    const contactTypes = new Set(activeContacts.map(c => c.contactInformation.type));
    if (contactTypes.size >= 3) {
      achievementsToCheck.push('contact_sharer');
    }

    return gamificationService.checkAndAwardMultiple(userId, achievementsToCheck);
  }

  /**
   * Check privacy-related achievements when contact information is created/updated
   */
  async checkPrivacyAchievements(personId: number): Promise<string[]> {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        user: true,
        contactInformation: {
          include: {
            contactInformation: true
          }
        }
      }
    });

    if (!person) return [];

    const userId = person.userId;
    const achievementsToCheck: string[] = [];

    // Filter to only non-deleted contacts
    const activeContacts = person.contactInformation.filter(pc => !pc.contactInformation.deleted);

    // Check: First private address
    const privateAddresses = activeContacts.filter(
      pc => pc.contactInformation.type === 'ADDRESS' && pc.contactInformation.privacy === 'PRIVATE'
    );
    if (privateAddresses.length >= 1) {
      achievementsToCheck.push('first_private_address');
    }

    // Check: Privacy explorer (at least one private and one public contact)
    const privateContacts = activeContacts.filter(pc => pc.contactInformation.privacy === 'PRIVATE');
    const publicContacts = activeContacts.filter(pc => pc.contactInformation.privacy === 'PUBLIC');
    if (privateContacts.length >= 1 && publicContacts.length >= 1) {
      achievementsToCheck.push('privacy_explorer');
    }

    return gamificationService.checkAndAwardMultiple(userId, achievementsToCheck);
  }

  /**
   * Check group-related achievements
   */
  async checkGroupAchievements(personId: number): Promise<string[]> {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        user: true,
        groupMemberships: {
          where: {
            group: { deleted: false }
          }
        }
      }
    });

    if (!person) return [];

    const userId = person.userId;
    const achievementsToCheck: string[] = [];

    // Check: First group join
    if (person.groupMemberships.length >= 1) {
      achievementsToCheck.push('first_group_join');
    }

    // Check: Group admin
    const adminGroups = person.groupMemberships.filter(pg => pg.isAdmin);
    if (adminGroups.length >= 1) {
      achievementsToCheck.push('group_admin');
    }

    return gamificationService.checkAndAwardMultiple(userId, achievementsToCheck);
  }

  /**
   * Award first group create achievement (called when user creates a group)
   */
  async awardGroupCreate(userId: number): Promise<string[]> {
    const achievement = await gamificationService.awardAchievement(userId, 'first_group_create');
    return achievement ? ['first_group_create'] : [];
  }

  /**
   * Award first person created achievement (called when user creates their first person)
   */
  async awardFirstPerson(userId: number): Promise<string[]> {
    const achievement = await gamificationService.awardAchievement(userId, 'first_person_created');
    return achievement ? ['first_person_created'] : [];
  }

  /**
   * Award email verified achievement
   */
  async awardEmailVerified(userId: number): Promise<string[]> {
    const achievement = await gamificationService.awardAchievement(userId, 'email_verified');
    return achievement ? ['email_verified'] : [];
  }

  /**
   * Award nearby discovery achievement (when user views nearby feature)
   */
  async awardNearbyDiscovery(userId: number): Promise<string[]> {
    const achievement = await gamificationService.awardAchievement(userId, 'nearby_discovery');
    return achievement ? ['nearby_discovery'] : [];
  }

  /**
   * Check if user has similar person and award achievement
   */
  async checkSimilarPersonAchievement(userId: number): Promise<string[]> {
    // This would be called when viewing recommendations with >25% similarity
    const achievement = await gamificationService.awardAchievement(userId, 'first_similar_person');
    return achievement ? ['first_similar_person'] : [];
  }

  /**
   * Check active member achievement (complete profile + 2+ groups + 5+ interests)
   */
  async checkActiveMemberAchievement(personId: number): Promise<string[]> {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        user: true,
        contactInformation: {
          include: {
            contactInformation: true
          }
        },
        interests: {
          include: {
            interest: true
          }
        },
        groupMemberships: {
          include: {
            group: true
          }
        }
      }
    });

    if (!person) return [];

    const userId = person.userId;

    // Filter to only non-deleted relations
    const activeContacts = person.contactInformation.filter(pc => !pc.contactInformation.deleted);
    const activeInterests = person.interests.filter(pi => !pi.interest.deleted);
    const activeGroups = person.groupMemberships.filter(pg => !pg.group.deleted);

    // Check all requirements for active member
    const hasCompleteProfile =
      person.firstName &&
      person.pronouns &&
      person.imageURL &&
      activeContacts.length >= 3;

    const hasTwoGroups = activeGroups.length >= 2;
    const hasFiveInterests = activeInterests.length >= 5;

    if (hasCompleteProfile && hasTwoGroups && hasFiveInterests) {
      const awarded = await gamificationService.awardAchievement(userId, 'active_member');
      return awarded ? ['active_member'] : [];
    }

    return [];
  }
}

// Export singleton instance
export const achievementTriggers = new AchievementTriggers();
