import { BaseModule } from '@/core/BaseModule';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartRoutes } from './cart.routes';

export class CartModule extends BaseModule {
  public readonly name = 'CartModule';
  public readonly version = '1.0.0';
  // Add dependencies if this module relies on others
  public readonly dependencies = [];

  private service!: CartService;
  private controller!: CartController;
  private routes!: CartRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new CartService(this.context.prisma);
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new CartController(this.service);
    this.routes = new CartRoutes(this.controller);

    this.router.use('/api/cart', this.routes.getRouter());
  }
}
