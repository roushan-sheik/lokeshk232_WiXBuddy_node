// src/modules/Auth/auth.validation.ts
import { z } from 'zod';

// Password validation with security requirements
const passwordSchema = z.string();
//   .min(8, 'Password must be at least 8 characters long')
//   .max(128, 'Password must not exceed 128 characters')
//   .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
//   .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
//   .regex(/^(?=.*\d)/, 'Password must contain at least one number');

// Role validation
const roleSchema = z.enum(['user', 'admin']);

// OTP code validation
const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP code must be exactly 6 digits')
  .transform(val => val.trim());

// Email validation helper
const emailSchema = z
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

export const AuthValidation = {
  // Registration validation - Adjusted to match Prisma schema (firstName/lastName are required)
  register: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      password_confirmation: z.string(),
      name: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(100, 'First name must not exceed 100 characters')
        .trim(),
      phone: z.string(),
      username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must not exceed 50 characters')
        .trim()
        .optional(),
      role: roleSchema.optional(),
    })
    .strict()
    .refine(data => data.password === data.password_confirmation, {
      message: 'Passwords do not match',
      path: ['password_confirmation'],
    })
    .transform(data => {
      const { password_confirmation, ...rest } = data;
      return rest;
    }),

  // Login validation
  login: z
    .object({
      email: emailSchema,
      password: z.string().min(1, 'Password is required'),
    })
    .strict(),

  // Email verification validation
  verifyEmail: z
    .object({
      email: emailSchema,
      code: otpCodeSchema,
    })
    .strict(),

  // Resend email verification validation
  resendEmailVerification: z
    .object({
      email: emailSchema,
    })
    .strict(),

  // Change password validation
  changePassword: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
      confirmNewPassword: z.string(),
    })
    .strict()
    .refine(data => data.newPassword === data.confirmNewPassword, {
      message: 'New passwords do not match',
      path: ['confirmNewPassword'],
    })
    .refine(data => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    })
    .transform(data => {
      const { confirmNewPassword, ...rest } = data;
      return rest;
    }),

  // Update Profile - Adjusted for schema fields
  updateProfile: z
    .object({
      firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(100, 'First name must not exceed 100 characters')
        .trim()
        .optional(),
      lastName: z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(100, 'Last name must not exceed 100 characters')
        .trim()
        .optional(),
      username: z.string().min(3, 'Username must be at least 3 characters').trim().optional(),
      bio: z.string().max(500, 'Bio must not exceed 500 characters').trim().optional(),
      avatarUrl: z.string().url('Avatar URL must be a valid URL').trim().optional(),
    })
    .strict(),

  // Update role validation (admin only)
  updateRole: z
    .object({
      role: roleSchema,
    })
    .strict(),

  // Refresh token validation
  refreshToken: z
    .object({
      token: z.string().min(1, 'Token is required').optional(),
    })
    .strict(),

  // Forgot password validation
  forgotPassword: z
    .object({
      email: emailSchema,
    })
    .strict(),

  // Password reset validation
  verifyResetPasswordOTPInput: z
    .object({
      email: emailSchema,
      code: otpCodeSchema,
    })
    .strict(),

  // Reset password validation
  resetPassword: z
    .object({
      email: emailSchema,
      newPassword: passwordSchema,
    })
    .strict(),

  // Parameter validation
  params: {
    userId: z.object({
      userId: z.string().min(1, 'User ID is required').uuid('User ID must be a valid UUID'),
    }),
  },
};

export type RegisterInput = z.infer<typeof AuthValidation.register> & { avatarFile?: Express.Multer.File };
export type LoginInput = z.infer<typeof AuthValidation.login>;
export type VerifyEmailInput = z.infer<typeof AuthValidation.verifyEmail>;
export type ResendEmailVerificationInput = z.infer<typeof AuthValidation.resendEmailVerification>;
export type ChangePasswordInput = z.infer<typeof AuthValidation.changePassword>;
export type UpdateRoleInput = z.infer<typeof AuthValidation.updateRole>;
export type RefreshTokenInput = z.infer<typeof AuthValidation.refreshToken>;
export type ForgotPasswordInput = z.infer<typeof AuthValidation.forgotPassword>;
export type VerifyResetPasswordOTPInput = z.infer<
  typeof AuthValidation.verifyResetPasswordOTPInput
>;
export type ResetPasswordInput = z.infer<typeof AuthValidation.resetPassword>;
export type UserIdParams = z.infer<typeof AuthValidation.params.userId>;
export type UpdateProfileInput = z.infer<typeof AuthValidation.updateProfile>;
