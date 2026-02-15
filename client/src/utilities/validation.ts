import { parsePhoneNumber } from 'libphonenumber-js';

export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email address';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return 'Phone number is required';
  }

  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      return 'Invalid phone number';
    }
    return null;
  } catch (error) {
    return 'Invalid phone number format';
  }
};
