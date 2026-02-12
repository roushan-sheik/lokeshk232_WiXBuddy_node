import { BaseModule } from "@/core/BaseModule";
import { ReviewsService } from "./reviews.service";
import { ReviewsController } from "./reviews.controller";
import { ReviewsRoutes } from "./reviews.routes";

export class ReviewsModule extends BaseModule {
  public readonly name = "ReviewsModule";
  public readonly version = "1.0.0";
  // Add dependencies if this module relies on others
  public readonly dependencies = [];

  private service!: ReviewsService;
  private controller!: ReviewsController;
  private routes!: ReviewsRoutes;

  protected async setupServices(): Promise<void> {
    this.service = new ReviewsService(this.context.prisma);
  }

  protected async setupRoutes(): Promise<void> {
    this.controller = new ReviewsController(this.service);
    this.routes = new ReviewsRoutes(this.controller);

    this.router.use("/api/reviews", this.routes.getRouter());
  }
}
