import { BaseModule } from '@/core/BaseModule';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
import { FaqRoutes } from './faq.routes';

export class FaqModule extends BaseModule {
    public readonly name = 'FaqModule';
    public readonly version = '1.0.0';
    // Add dependencies if this module relies on others
    public readonly dependencies = []; 

    private service!: FaqService;
    private controller!: FaqController;
    private routes!: FaqRoutes;

    protected async setupServices(): Promise<void> {
        this.service = new FaqService(this.context.prisma);
    }

    protected async setupRoutes(): Promise<void> {
        this.controller = new FaqController(this.service);
        this.routes = new FaqRoutes(this.controller);

        this.router.use('/api/faqs', this.routes.getRouter());
    }
}
