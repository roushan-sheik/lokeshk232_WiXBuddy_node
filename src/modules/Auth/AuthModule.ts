import bcrypt from 'bcrypt';
// src/modules/Auth/AuthModule.ts
import { BaseModule } from '@/core/BaseModule';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRoutes } from './auth.routes';
import { AppLogger } from '@/core/logging/logger';
import { config } from '@/core/config';

export class AuthModule extends BaseModule {
  public readonly name = 'AuthModule';
  public readonly version = '1.0.0';
  public readonly dependencies = [];
  private readonly SALT_ROUNDS = 12;
  private authService!: AuthService;
  private authController!: AuthController;
  private authRoutes!: AuthRoutes;
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  /**
   * Setup module services
   */
  protected async setupServices(): Promise<void> {
    // Validate JWT configuration
    if (!config.security.jwt.secret) {
      throw new Error('JWT_SECRET is required in environment variables');
    }

    // Initialize service
    this.authService = new AuthService(this.context.prisma);
    // AppLogger.info('AuthService initialized successfully');
  }

  /**
   * Setup module routes
   */
  protected async setupRoutes(): Promise<void> {
    // Initialize controller
    this.authController = new AuthController(this.authService);
    // AppLogger.info('AuthController initialized successfully');

    // Initialize routes
    this.authRoutes = new AuthRoutes(this.authController);
    // AppLogger.info('AuthRoutes initialized successfully');

    // Mount routes under /api/auth
    this.router.use('/api', this.authRoutes.getRouter());
  }

  /**
   * Custom initialization logic before services setup
   */
  protected async onBeforeInit(): Promise<void> {
    // Validate JWT configuration
    if (!config.security.jwt.secret) {
      throw new Error('JWT_SECRET environment variable is required for authentication module');
    }

    if (!config.security.jwt.expiresIn) {
      AppLogger.warn('JWT_EXPIRES_IN not set, using default value: 1d');
    }
  }

  /**
   * Custom initialization logic after routes setup
   */
  protected async onAfterInit(): Promise<void> {
    // Create default admin user if none exists
    await this.createDefaultAdmin();

    // Log authentication module status
    AppLogger.info('Authentication module initialized with the following configuration:', {
      jwtExpiresIn: config.security.jwt.expiresIn,
      jwtIssuer: config.security.jwt.issuer,
      environment: config.server.env,
    });
  }

  /**
   * Module-specific health check
   */
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      // Check database connectivity
      const userCount = await this.context.prisma.user.count();

      // Check JWT configuration
      const jwtConfigured = !!config.security.jwt.secret;

      // Get user statistics
      const activeUsers = await this.context.prisma.user.count({
        where: { status: 'active' },
      });

      const adminUsers = await this.context.prisma.user.count({
        where: { role: 'admin' },
      });

      const isHealthy = jwtConfigured && userCount >= 0;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          jwtConfigured,
          totalUsers: userCount,
          activeUsers,
          adminUsers,
          lastChecked: new Date().toISOString(),
        },
      };
    } catch (error) {
      AppLogger.error('AuthModule health check failed', { error });
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          lastChecked: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Cleanup resources when module is shutting down
   */
  protected async cleanup(): Promise<void> {
    // Perform cleanup tasks
    // AppLogger.info('Cleaning up AuthModule resources...');
    // In a real application, you might want to:
    // - Invalidate active tokens
    // - Clear authentication caches
    // - Close any additional connections
    // AppLogger.info('AuthModule cleanup completed');
  }

  /**
   * Create default admin user if none exists
   */
  private async createDefaultAdmin(): Promise<void> {
    try {
      const adminCount = await this.context.prisma.user.count({
        where: { role: 'admin' },
      });

      if (adminCount === 0) {
        const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';

        if (defaultAdminPassword === 'Admin123!') {
          AppLogger.warn(
            '⚠️ Using default admin password. Please change it immediately in production!'
          );
        }

        const hashedPassword = await this.hashPassword(defaultAdminPassword);
        const firstName = 'Admin';
        const lastName = 'User';

        // Create user directly in the database
        await this.context.prisma.user.create({
          data: {
            email: defaultAdminEmail,
            password: hashedPassword,
            name: firstName,
            role: 'admin',
            status: 'active',
            // email_verified_at: new Date(),
          },
        });

        AppLogger.info('🔐 Default admin user created', {
          email: defaultAdminEmail,
          firstName: firstName,
          lastName: lastName,
          role: 'admin',
          status: 'active',
        });
      }
    } catch (error) {
      // Don't throw error here as it's not critical for module initialization
      AppLogger.error('Failed to create default admin user', { error });
    }
  }

  // Getter methods for accessing module components (useful for testing and integration)
  public getAuthService(): AuthService {
    return this.authService;
  }

  public getAuthController(): AuthController {
    return this.authController;
  }
}
