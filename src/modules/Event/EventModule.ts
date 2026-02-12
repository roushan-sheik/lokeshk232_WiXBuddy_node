import { BaseModule } from '@/core/BaseModule';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { EventRoutes } from './event.routes';

export class EventModule extends BaseModule {
    public readonly name = 'EventModule';
    public readonly version = '1.0.0';
    // Add dependencies if this module relies on others
    public readonly dependencies = []; 

    private service!: EventService;
    private controller!: EventController;
    private routes!: EventRoutes;

    protected async setupServices(): Promise<void> {
        this.service = new EventService(this.context.prisma);
    }

    protected async setupRoutes(): Promise<void> {
        this.controller = new EventController(this.service);
        this.routes = new EventRoutes(this.controller);

        this.router.use('/api/events', this.routes.getRouter());
    }
}
