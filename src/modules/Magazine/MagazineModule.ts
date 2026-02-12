import { BaseModule } from "@/core/BaseModule";
import { MagazineService } from "./magazine.service";
import { MagazineController } from "./magazine.controller";
import { MagazineRoutes } from "./magazine.routes";

export class MagazineModule extends BaseModule {
  public readonly name = "MagazineModule";
  public readonly version = "1.0.0";
  // Add dependencies if this module relies on others
  public readonly dependencies = [];

  private service!: MagazineService;
  private controller!: MagazineController;
  private routes!: MagazineRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new MagazineService(this.context.prisma);
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new MagazineController(this.service);
    this.routes = new MagazineRoutes(this.controller);

    this.router.use("/api/magazine", this.routes.getRouter());
  }
}
