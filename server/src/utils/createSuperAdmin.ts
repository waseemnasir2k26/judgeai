import { User } from '../models/User.js';
import { logger } from './logger.js';

export async function createSuperAdmin(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    logger.warn('SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD not set. Skipping superadmin creation.');
    return;
  }

  try {
    const existingAdmin = await User.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      // Update to superadmin if not already
      if (existingAdmin.role !== 'superadmin') {
        existingAdmin.role = 'superadmin';
        existingAdmin.accountState = 'approved';
        existingAdmin.isEmailVerified = true;
        await existingAdmin.save();
        logger.info(`Updated existing user ${email} to superadmin`);
      }
      return;
    }

    const superadmin = new User({
      email: email.toLowerCase(),
      password,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'superadmin',
      accountState: 'approved',
      isEmailVerified: true,
    });

    await superadmin.save();
    logger.info(`Superadmin created: ${email}`);
  } catch (error) {
    logger.error('Failed to create superadmin:', error);
  }
}
