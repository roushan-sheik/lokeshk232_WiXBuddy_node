// src/modules/OTP/otp.service.ts
import crypto from "crypto";
import { AppLogger } from "@/core/logging/logger";
import { SESEmailService } from "@/services/SESEmailService";
import { BadRequestError } from "@/core/errors/AppError";
import cron from "node-cron";
import { PrismaClient } from "@/generated/prisma/client";

export interface OTPData {
  id: string;
  identifier: string; // email only for auth purposes
  code: number;
  type: OTPType;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
  updated_at: Date;
  userId?: string;
}

export enum OTPType {
  email_verification = "email_verification",
  login_verification = "login_verification",
  password_reset = "password_reset",
  two_factor = "two_factor",
}

export interface SendOTPInput {
  identifier: string; // email address
  type: OTPType;
  userId?: string | number;
}

export interface VerifyOTPInput {
  identifier: string;
  code: string;
  type: OTPType;
}

export interface OTPResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
  attemptsRemaining?: number;
}

export class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 3;
  private readonly MAX_SENDS_PER_HOUR = 5; // Slight increase to avoid friction
  private readonly RESEND_COOLDOWN_MINUTES = 1; // Reduced for better UX
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

  private prisma: PrismaClient;
  private emailService: SESEmailService;

  constructor(prisma: PrismaClient, emailService: SESEmailService) {
    this.prisma = prisma;
    this.emailService = emailService;
    this.setupCleanupJob();
  }

  private setupCleanupJob(): void {
    cron.schedule("*/20 * * * *", async () => {
      try {
        AppLogger.info("Running scheduled OTP cleanup...");
        const deletedCount = await this.cleanupExpiredOTPs();
        AppLogger.info("Scheduled OTP cleanup completed", { deletedCount });
      } catch (error) {
        AppLogger.error("Error during scheduled OTP cleanup", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  // Helper method to extract email string from identifier
  private getEmailFromIdentifier(
    identifier: string | { email: string },
  ): string {
    return typeof identifier === "string" ? identifier : identifier.email;
  }

  /**
   * Generate and send OTP with enhanced spam prevention
   */
  async sendOTP(data: SendOTPInput): Promise<OTPResult> {
    const { identifier, type, userId } = data;

    const email = this.getEmailFromIdentifier(identifier);

    // Check rate limiting (hourly limit)
    await this.checkRateLimit(email, type);

    // Check if there's a recent OTP that hasn't expired (prevent spam)
    await this.checkRecentOTP(email, type);

    // Clean up any existing OTPs for this identifier and type
    await this.cleanupExistingOTPs(email, type);

    // Generate OTP code
    const code = this.generateOTPCode();
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Save OTP to database
    const otpRecord = await this.prisma.oTP.create({
      data: {
        identifier: email,
        code: code,
        type: type,
        expiresAt: expiresAt,
        verified: false,
        attempts: 0,
        // userId: userId,
      },
    });

    // Send OTP via email
    try {
      await this.sendOTPEmail(email, code, type, expiresAt);

      AppLogger.info("OTP sent successfully", {
        identifier: this.maskEmail(email),
        type,
        userId,
        expiresAt,
      });

      return {
        success: true,
        message: "OTP sent successfully to your email",
        expiresAt,
        attemptsRemaining: this.MAX_ATTEMPTS,
      };
    } catch (error) {
      // If email sending fails, delete the OTP record
      await this.prisma.oTP.delete({
        where: { id: otpRecord.id },
      });

      AppLogger.error("Failed to send OTP email", {
        error: error instanceof Error ? error.message : "Unknown error",
        identifier: this.maskEmail(email),
        type,
      });
      throw new BadRequestError("Failed to send OTP. Please try again.");
    }
  }

  /**
   * Verify OTP code and delete after successful verification
   */
  async verifyOTP(data: VerifyOTPInput): Promise<OTPResult> {
    const { identifier, code, type } = data;
    const email = this.getEmailFromIdentifier(identifier);

    const numericCode = parseInt(code, 10);
    if (isNaN(numericCode) || numericCode < 100000 || numericCode > 999999) {
      throw new BadRequestError(
        "Invalid OTP format. Please enter a 6-digit code.",
      );
    }

    const otpRecord = await this.prisma.oTP.findFirst({
      where: { identifier: email, type, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new BadRequestError("Invalid or expired OTP");
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { verified: true }, // Invalidate it by marking verified (or delete)
      });
      throw new BadRequestError("OTP has expired. Please request a new one.");
    }

    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      await this.prisma.oTP.delete({ where: { id: otpRecord.id } });
      throw new BadRequestError(
        "Maximum verification attempts exceeded. Please request a new OTP.",
      );
    }

    if (otpRecord.code !== numericCode) {
      const newAttempts = otpRecord.attempts + 1;
      if (newAttempts >= this.MAX_ATTEMPTS) {
        await this.prisma.oTP.delete({ where: { id: otpRecord.id } });
        throw new BadRequestError(
          "Maximum verification attempts exceeded. Please request a new OTP.",
        );
      }

      await this.prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: newAttempts },
      });

      const attemptsRemaining = this.MAX_ATTEMPTS - newAttempts;
      throw new BadRequestError(
        `Invalid OTP code. ${attemptsRemaining} attempts remaining.`,
      );
    }

    // OTP is valid
    if (type === OTPType.password_reset || type === OTPType.two_factor) {
      await this.prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      });
    } else {
      await this.prisma.oTP.delete({ where: { id: otpRecord.id } });
    }

    return {
      success: true,
      message: "OTP verified successfully",
    };
  }

  async hasPendingOTP(identifier: string, type: OTPType): Promise<boolean> {
    const existingOTP = await this.prisma.oTP.findFirst({
      where: { identifier, type, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!existingOTP) return false;

    if (new Date() > existingOTP.expiresAt) {
      await this.prisma.oTP.delete({ where: { id: existingOTP.id } });
      return false;
    }

    return true;
  }

  async cleanupExpiredOTPs(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.oTP.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    return result.count;
  }

  async cleanupUserOTPs(identifier: string): Promise<number> {
    const result = await this.prisma.oTP.deleteMany({
      where: { identifier },
    });
    return result.count;
  }

  private generateOTPCode(): number {
    return crypto.randomInt(100000, 999999);
  }

  private async checkRateLimit(
    identifier: string,
    type: OTPType,
  ): Promise<void> {
    const oneHourAgo = new Date(Date.now() - this.RATE_LIMIT_WINDOW);
    const recentOTPs = await this.prisma.oTP.count({
      where: {
        identifier: identifier,
        type,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentOTPs >= this.MAX_SENDS_PER_HOUR) {
      throw new BadRequestError(
        `Too many OTP requests. Please wait an hour before requesting another OTP.`,
      );
    }
  }

  private async checkRecentOTP(
    identifier: string,
    type: OTPType,
  ): Promise<void> {
    const cooldownTime = new Date(
      Date.now() - this.RESEND_COOLDOWN_MINUTES * 60 * 1000,
    );
    const recentOTP = await this.prisma.oTP.findFirst({
      where: { identifier: identifier, type, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (recentOTP && recentOTP.createdAt > cooldownTime) {
      const waitTime = Math.ceil(
        (recentOTP.createdAt.getTime() +
          this.RESEND_COOLDOWN_MINUTES * 60 * 1000 -
          Date.now()) /
          60000,
      );
      throw new BadRequestError(
        `Please wait ${waitTime} minute${waitTime > 1 ? "s" : ""} before requesting a new OTP.`,
      );
    }
  }

  private async cleanupExistingOTPs(
    identifier: string,
    type: OTPType,
  ): Promise<void> {
    await this.prisma.oTP.deleteMany({
      where: { identifier: identifier, type },
    });
  }

  /**
   * Send OTP Email using File Templates
   */
  private async sendOTPEmail(
    email: string,
    code: number,
    type: OTPType,
    expiresAt: Date,
  ): Promise<void> {
    const expiryMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / 60000);

    // Map OTPType to template filenames
    const templateMap: Record<OTPType, string> = {
      [OTPType.email_verification]: "email-verification-otp",
      [OTPType.login_verification]: "login-verification-otp",
      [OTPType.password_reset]: "password-reset-otp",
      [OTPType.two_factor]: "two-factor-otp",
    };

    const subjects: Record<OTPType, string> = {
      [OTPType.email_verification]: "Verify Your Email Address",
      [OTPType.login_verification]: "Login Verification Code",
      [OTPType.password_reset]: "Password Reset Code",
      [OTPType.two_factor]: "Two-Factor Authentication Code",
    };

    const templateName = templateMap[type];
    const subject = subjects[type];

    // Use the SES service to send the templated email
    await this.emailService.sendTemplatedEmail(templateName, {
      to: email,
      subject: subject,
      templateData: {
        code: code,
        email: email,
        expiryMinutes: expiryMinutes,
        year: new Date().getFullYear(),
      },
    });
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) return email;
    const maskedLocal =
      localPart.charAt(0) +
      "*".repeat(localPart.length - 2) +
      localPart.charAt(localPart.length - 1);
    return `${maskedLocal}@${domain}`;
  }
}
