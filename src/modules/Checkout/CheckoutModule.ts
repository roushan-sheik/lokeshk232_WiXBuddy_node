import { BaseModule } from '@/core/BaseModule';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { CheckoutRoutes } from './checkout.routes';

export class CheckoutModule extends BaseModule {
    public readonly name = 'CheckoutModule';
    public readonly version = '1.0.0';
    // Add dependencies if this module relies on others
    public readonly dependencies = []; 

    private service!: CheckoutService;
    private controller!: CheckoutController;
    private routes!: CheckoutRoutes;

    protected async setupServices(): Promise<void> {
        this.service = new CheckoutService(this.context.prisma);
    }

    protected async setupRoutes(): Promise<void> {
        this.controller = new CheckoutController(this.service);
        this.routes = new CheckoutRoutes(this.controller);

        this.router.use('/api/checkouts', this.routes.getRouter());
    }
}
