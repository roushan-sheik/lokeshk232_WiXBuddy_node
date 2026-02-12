import { BaseModule } from '@/core/BaseModule';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { TicketRoutes } from './ticket.routes';

export class TicketModule extends BaseModule {
  public readonly name = 'TicketModule';
  public readonly version = '1.0.0';
  // Add dependencies if this module relies on others
  public readonly dependencies = [];

  private service!: TicketService;
  private controller!: TicketController;
  private routes!: TicketRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new TicketService(this.context.prisma);
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new TicketController(this.service);
    this.routes = new TicketRoutes(this.controller);

    this.router.use('/api/tickets', this.routes.getRouter());
  }
}
