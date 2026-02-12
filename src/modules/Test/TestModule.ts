import { BaseModule } from '@/core/BaseModule';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { TestRoutes } from './test.routes';

export class TestModule extends BaseModule {
    public readonly name = 'TestModule';
    public readonly version = '1.0.0';
    // Add dependencies if this module relies on others
    public readonly dependencies = []; 

    private service!: TestService;
    private controller!: TestController;
    private routes!: TestRoutes;

    protected async setupServices(): Promise<void> {
        this.service = new TestService(this.context.prisma);
    }

    protected async setupRoutes(): Promise<void> {
        this.controller = new TestController(this.service);
        this.routes = new TestRoutes(this.controller);

        this.router.use('/api/tests', this.routes.getRouter());
    }
}
