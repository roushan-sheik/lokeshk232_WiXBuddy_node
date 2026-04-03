// src/modules/Auth/auth.controller.ts
import { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { AuthService } from './auth.service';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';
import { config } from '@/core/config';

export class AuthController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  public register = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('register', req, { email: body.email, role: body.role });
    console.log;
    ({ body });
    ({ body });
    // Add file to body if it exists
    const registerData = {
      ...body,
      avatarFile: req.file,
    };
    
    const result = await this.authService.register(registerData);

    return this.sendCreatedResponse(res, result, 'User registered successfully');
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  public login = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('login', req, { email: body.email });

    const result = await this.authService.login(body);

    this.setAuthCookie(res, result.token); // <-- helper used here

    return this.sendResponse(res, 'Login successful', HTTPStatusCode.OK, result);
  };

  /**
   * Verify email
   * POST /api/auth/verify-email
   */
  public verifyEmail = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('verifyEmail', req, { email: body.email });

    const result = await this.authService.verifyEmail(body);

    this.setAuthCookie(res, result.token); // <-- helper used here

    return this.sendResponse(res, 'Email verification successful', HTTPStatusCode.OK, result);
  };

  /**
   * Resend verification email
   * POST /api/auth/resend-verification-email
   */
  public resendEmailVerification = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('resendEmailVerification', req, { email: body.email });

    const result = await this.authService.resendEmailVerification(body);

    return this.sendResponse(
      res,
      'Verification email sent successfully',
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  public logout = async (req: Request, res: Response) => {
    this.logAction('logout', req, { userId: this.getUserId(req) });

    this.clearAuthCookie(res); // <-- helper used here

    return this.sendResponse(res, 'Logout successful', HTTPStatusCode.OK);
  };

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  public getProfile = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(res, 'User not authenticated', HTTPStatusCode.UNAUTHORIZED);
    }

    this.logAction('getProfile', req, { userId });

    const profile = await this.authService.getProfile(userId);

    return this.sendResponse(res, 'Profile retrieved successfully', HTTPStatusCode.OK, profile);
  };

  /**
   * Refresh authentication token
   * POST /api/auth/refresh
   */
  public refreshToken = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    const currentToken =
      body?.token || req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token; // <- also check cookie

    if (!currentToken) {
      return this.sendResponse(res, 'Token is required', HTTPStatusCode.BAD_REQUEST);
    }

    this.logAction('refreshToken', req);

    const result = await this.authService.refreshToken(currentToken);

    // Always set new cookie (dev + prod), but secure flags differ
    this.setAuthCookie(res, result.token);

    return this.sendResponse(res, 'Token refreshed successfully', HTTPStatusCode.OK, result);
  };

  /**
   * Change user password
   * POST /api/auth/change-password
   */
  public changePassword = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(res, 'User not authenticated', HTTPStatusCode.UNAUTHORIZED);
    }

    const body = req.validatedBody || req.body;
    this.logAction('changePassword', req, { userId });

    const result = await this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword
    );

    return this.sendResponse(res, 'Password changed successfully', HTTPStatusCode.OK, result);
  };

  /**
   * Update user (admin only)
   * PUT /api/auth/update-profile
   */
  public updateProfile = async (req: Request, res: Response) => {
    const userId = this.getUserId(req);
    if (!userId) {
      return this.sendResponse(res, 'User not authenticated', HTTPStatusCode.UNAUTHORIZED);
    }

    const body = req.validatedBody || req.body;
    this.logAction('updateUser', req, { userId });

    const updatedUser = await this.authService.updateProfile(userId, body);

    return this.sendResponse(
      res,
      'User profile updated successfully',
      HTTPStatusCode.OK,
      updatedUser
    );
  };

  /**
   * Update user role (admin only)
   * PUT /api/auth/users/:userId/role
   */
  public updateUserRole = async (req: Request, res: Response) => {
    const params = req.validatedParams || req.params;
    const body = req.validatedBody || req.body;
    const { userId } = params;
    const currentUserId = this.getUserId(req);

    this.logAction('updateUserRole', req, {
      targetUserId: userId,
      currentUserId,
      newRole: body.role,
    });

    const updatedUser = await this.authService.updateUserRole(userId, body.role);

    return this.sendResponse(res, 'User role updated successfully', HTTPStatusCode.OK, updatedUser);
  };

  /**
   * Verify token validity
   * POST /api/auth/verify
   */
  public verifyToken = async (req: Request, res: Response) => {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      req.body?.token || // <- safe optional access
      req.cookies?.auth_token || // <- unified cookie name
      req.cookies?.token; // <- fallback for old cookie name

    if (!token) {
      return this.sendResponse(res, 'Token is required', HTTPStatusCode.BAD_REQUEST);
    }

    this.logAction('verifyToken', req);

    const tokenInfo = await this.authService.verifyToken(token);

    return this.sendResponse(res, 'Token is valid', HTTPStatusCode.OK, tokenInfo);
  };

  /**
   * Get all users (admin only) - Updated to use BaseService pagination
   * GET /api/auth/users
   */
  public getUsers = async (req: Request, res: Response) => {
    const pagination = this.extractPaginationParams(req);
    this.logAction('getUsers', req, { pagination });

    // Use the AuthService method that leverages BaseService pagination
    const result = await this.authService.getUsers(pagination);

    return this.sendPaginatedResponse(
      res,
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      },
      'Users retrieved successfully',
      result.data
    );
  };

  /**
   * Get user statistics (admin only) - Updated to use AuthService method
   * GET /api/auth/stats
   */
  public getAuthStats = async (req: Request, res: Response) => {
    this.logAction('getAuthStats', req);

    const stats = await this.authService.getAuthStats();

    return this.sendResponse(
      res,
      'Authentication statistics retrieved successfully',
      HTTPStatusCode.OK,
      stats
    );
  };

  /**
   * Forgot password - send reset code
   * POST /api/auth/forgot-password
   */
  public forgotPassword = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('forgotPassword', req, { email: body.email });

    const result = await this.authService.forgotPassword(body);

    return this.sendResponse(res, 'Password reset instructions sent', HTTPStatusCode.OK, result);
  };

  /**
   * Verify Reset password with OTP
   * POST /api/auth/verify-reset-password-OTP
   */
  public verifyResetPasswordOTP = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('resetPassword', req, { email: body.email });

    const result = await this.authService.verifyResetPasswordOTP(body);

    return this.sendResponse(
      res,
      'Password reset code verified successfully. You can now reset your password.',
      HTTPStatusCode.OK,
      result
    );
  };

  /**
   * Reset password with OTP
   * POST /api/auth/reset-password
   */
  public resetPassword = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('resetPassword', req, { email: body.email });

    const result = await this.authService.resetPassword(body);

    return this.sendResponse(res, 'Password reset successfully', HTTPStatusCode.OK, result);
  };

  /**
   * Resend OTP for password reset
   * POST /api/auth/resend-otp
   */
  public resendResetPasswordOTP = async (req: Request, res: Response) => {
    const body = req.validatedBody || req.body;
    this.logAction('resendResetPasswordOTP', req, { email: body.email });

    const result = await this.authService.resendResetPasswordOTP(body);

    return this.sendResponse(res, 'Password reset OTP sent', HTTPStatusCode.OK, result);
  };
}
