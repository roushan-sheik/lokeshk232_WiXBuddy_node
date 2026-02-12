import { BaseModule } from "@/core/BaseModule";
import { ContactService } from "./contact.service";
import { ContactController } from "./contact.controller";
import { ContactRoutes } from "./contact.routes";

export class ContactModule extends BaseModule {
  public readonly name = "ContactModule";
  public readonly version = "1.0.0";
  // Add dependencies if this module relies on others
  public readonly dependencies = [];

  private service!: ContactService;
  private controller!: ContactController;
  private routes!: ContactRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new ContactService(this.context.prisma);
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new ContactController(this.service);
    this.routes = new ContactRoutes(this.controller);

    this.router.use("/api/contact", this.routes.getRouter());
  }
}
