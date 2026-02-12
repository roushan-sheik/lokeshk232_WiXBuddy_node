import { BaseModule } from "@/core/BaseModule";
import { FavoriteService } from "./favorite.service";
import { FavoriteController } from "./favorite.controller";
import { FavoriteRoutes } from "./favorite.routes";

export class FavoriteModule extends BaseModule {
  public readonly name = "FavoriteModule";
  public readonly version = "1.0.0";
  // Add dependencies if this module relies on others
  public readonly dependencies = [];

  private service!: FavoriteService;
  private controller!: FavoriteController;
  private routes!: FavoriteRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new FavoriteService(this.context.prisma);
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new FavoriteController(this.service);
    this.routes = new FavoriteRoutes(this.controller);

    this.router.use("/api/favorites", this.routes.getRouter());
  }
}
