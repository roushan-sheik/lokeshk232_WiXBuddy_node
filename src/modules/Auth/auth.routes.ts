// src/modules/Auth/auth.routes.ts
import { Router, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';
import { authenticate, authorize } from '@/middleware/auth';
import { AuthValidation } from './auth.validation';
import multer from 'multer';
const upload = multer();
export class AuthRoutes {
  private router: Router;
  private authController: AuthController;

  constructor(authController: AuthController) {
    this.router = Router();
    this.authController = authController;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes (no authentication required)

    // Register new user
    this.router.post(
      '/register',
      upload.single('avatar'),
      validateRequest({
        body: AuthValidation.register,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.register(req, res))
    );

    // Login user
    this.router.post(
      '/login',
      upload.none(),
      validateRequest({
        body: AuthValidation.login,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.login(req, res))
    );

    // Verify email
    this.router.post(
      '/verify-email',
      validateRequest({
        body: AuthValidation.verifyEmail,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.verifyEmail(req, res))
    );

    // Resend email verification
    this.router.post(
      '/resend-email-verification',
      validateRequest({
        body: AuthValidation.resendEmailVerification,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.authController.resendEmailVerification(req, res)
      )
    );

    // Forgot password - send reset code
    this.router.post(
      '/forgot-password',
      validateRequest({
        body: AuthValidation.forgotPassword,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.forgotPassword(req, res))
    );

    // Reset password with OTP
    this.router.post(
      '/verify-reset-password-OTP',
      validateRequest({
        body: AuthValidation.verifyResetPasswordOTPInput,
      }),
      asyncHandler((req: Request, res: Response) =>
        this.authController.verifyResetPasswordOTP(req, res)
      )
    );

    // Reset password
    this.router.post(
      '/reset-password',
      validateRequest({
        body: AuthValidation.resetPassword,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.resetPassword(req, res))
    );

    // Verify token (useful for client-side token validation)
    this.router.post(
      '/verify',
      authenticate,
      asyncHandler((req: Request, res: Response) => this.authController.verifyToken(req, res))
    );

    // Refresh token
    this.router.post(
      '/refresh',
      validateRequest({
        body: AuthValidation.refreshToken,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.refreshToken(req, res))
    );

    // Protected routes (authentication required)

    // Get current user profile
    this.router.get(
      '/profile',
      authenticate,
      asyncHandler((req: Request, res: Response) => this.authController.getProfile(req, res))
    );

    // Logout user
    this.router.post(
      '/logout',
      authenticate,
      asyncHandler((req: Request, res: Response) => this.authController.logout(req, res))
    );

    // Change password
    this.router.post(
      '/change-password',
      authenticate,
      validateRequest({
        body: AuthValidation.changePassword,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.changePassword(req, res))
    );

    // Update profile
    this.router.patch(
      '/update-profile',
      authenticate,
      validateRequest({
        body: AuthValidation.updateProfile,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.updateProfile(req, res))
    );

    // Admin only routes

    // Get all users (admin only)
    this.router.get(
      '/users',
      authenticate,
      authorize('admin'),
      asyncHandler((req: Request, res: Response) => this.authController.getUsers(req, res))
    );

    // Update user role (admin only)
    this.router.put(
      '/users/:userId/role',
      authenticate,
      authorize('admin'),
      validateRequest({
        params: AuthValidation.params.userId,
        body: AuthValidation.updateRole,
      }),
      asyncHandler((req: Request, res: Response) => this.authController.updateUserRole(req, res))
    );

    // Get authentication statistics (admin only)
    this.router.get(
      '/stats',
      authenticate,
      authorize('admin'),
      asyncHandler((req: Request, res: Response) => this.authController.getAuthStats(req, res))
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
