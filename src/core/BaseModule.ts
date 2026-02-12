// src/core/BaseModule.ts
import { Router } from 'express';
import { Context } from './Context';
import { IgnitorModule } from './IgnitorModule';
import { AppLogger } from './logging/logger';

export abstract class BaseModule implements IgnitorModule {
    public abstract readonly name: string;
    public abstract readonly version: string;
    public abstract readonly dependencies?: string[];

    protected router: Router;
    protected context!: Context;

    constructor() {
        this.router = Router();
    }

    /**
     * Initialize the module
     * This method is called during application startup
     */
    public async initialize(context: Context): Promise<void> {
        this.context = context;

        AppLogger.info(`Initializing module: ${this.name} v${this.version}`);

        // Call the setup methods in order
        await this.onBeforeInit();
        await this.setupServices();
        await this.setupRoutes();
        await this.onAfterInit();

        AppLogger.info(`Module ${this.name} initialized successfully`);
    }

    /**
     * Setup module routes
     * Override this method to define your routes
     */
    protected abstract setupRoutes(): Promise<void>;

    /**
     * Setup module services
     * Override this method to initialize services, repositories, etc.
     */
    protected abstract setupServices(): Promise<void>;

    /**
     * Hook called before module initialization
     * Override for custom pre-initialization logic
     */
    protected async onBeforeInit(): Promise<void> {
        // Default implementation - can be overridden
    }

    /**
     * Hook called after module initialization
     * Override for custom post-initialization logic
     */
    protected async onAfterInit(): Promise<void> {
        // Default implementation - can be overridden
    }

    /**
     * Cleanup resources when shutting down
     * Override this method to cleanup resources
     */
    public async onShutdown(): Promise<void> {
        AppLogger.info(`Shutting down module: ${this.name}`);
        await this.cleanup();
    }

    /**
     * Override this method to implement custom cleanup logic
     */
    protected async cleanup(): Promise<void> {
        // Default implementation - can be overridden
    }

    /**
     * Get the router instance for this module
     */
    public getRouter(): Router {
        return this.router;
    }

    /**
     * Get module metadata
     */
    public getMetadata() {
        return {
            name: this.name,
            version: this.version,
            dependencies: this.dependencies || [],
        };
    }

    /**
     * Health check for the module
     * Override this method to implement module-specific health checks
     */
    public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
        return { status: 'healthy' };
    }
}
