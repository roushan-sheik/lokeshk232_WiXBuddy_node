// scripts/generate-module.ts
import fs from 'fs';
import path from 'path';

// 1. Get Module Name from CLI
const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Please provide a module name (e.g., Product)');
  console.error('👉 Usage: npx ts-node scripts/generate-module.ts Product');
  process.exit(1);
}

// 2. Helpers for casing
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const uncapitalize = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const PascalName = capitalize(moduleName); // e.g., Product
const camelName = uncapitalize(moduleName); // e.g., product

const baseDir = path.join(process.cwd(), 'src', 'modules', PascalName);

// 3. Ensure directory exists
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// --- TEMPLATES ---

// 1. Validation Template
const validationTemplate = `import { z } from 'zod';

export const ${PascalName}Validation = {
    // Create ${PascalName}
    create: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        description: z.string().max(500).optional(),
        status: z.enum(['active', 'inactive']).optional().default('active'),
    }).strict(),

    // Update ${PascalName}
    update: z.object({
        name: z.string().min(2).max(100).optional(),
        description: z.string().max(500).optional(),
        status: z.enum(['active', 'inactive']).optional(),
    }).strict(),

    // Params validation
    params: {
        id: z.object({
            id: z.string().uuid('Invalid ID format'),
        }),
    }
};

export type Create${PascalName}Input = z.infer<typeof ${PascalName}Validation.create>;
export type Update${PascalName}Input = z.infer<typeof ${PascalName}Validation.update>;
`;

// 2. Service Template (FIXED: Uses BaseService logic directly)
const serviceTemplate = `import { BaseService } from '@/core/BaseService';
import { PrismaClient } from '@/generated/prisma/client';
import { PaginationOptions } from '@/types/types';
import { Create${PascalName}Input, Update${PascalName}Input } from './${camelName}.validation';

export class ${PascalName}Service extends BaseService<any, Create${PascalName}Input, Update${PascalName}Input> { 
    
    constructor(prisma: PrismaClient) {
        super(prisma, '${PascalName}', {
            enableSoftDelete: true,
            enableAuditFields: true
        });
    }

    protected getModel() {
        // @ts-ignore - The model '${camelName}' might not exist in PrismaClient types yet
        return this.prisma.${camelName}; 
    }

    // =========================================================================
    // Public API - Exposing BaseService methods
    // Since BaseService methods are protected, we must expose them here
    // =========================================================================

    public async create(data: Create${PascalName}Input, include?: any) {
        return super.create(data, include);
    }

    public async findMany(
        filters: any = {},
        pagination?: Partial<PaginationOptions>,
        orderBy?: any,
        include?: any
    ) {
        return super.findMany(filters, pagination, orderBy, include);
    }

    public async findById(id: string, include?: any) {
        return super.findById(id, include);
    }

    public async updateById(id: string, data: Update${PascalName}Input, include?: any) {
        return super.updateById(id, data, include);
    }

    public async deleteById(id: string) {
        return super.deleteById(id);
    }

    public async exists(filters: any) {
        return super.exists(filters);
    }
}
`;

// 3. Controller Template
const controllerTemplate = `import { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { ${PascalName}Service } from './${camelName}.service';
import { HTTPStatusCode } from '@/types/HTTPStatusCode';

export class ${PascalName}Controller extends BaseController {
    constructor(private service: ${PascalName}Service) {
        super();
    }

    /**
     * Create a new ${PascalName}
     */
    public create = async (req: Request, res: Response) => {
        const body = req.validatedBody;
        this.logAction('create', req, { body });
        
        const result = await this.service.create(body);
        
        return this.sendCreatedResponse(res, result, '${PascalName} created successfully');
    };

    /**
     * Get all ${PascalName}s
     */
    public getAll = async (req: Request, res: Response) => {
        const pagination = this.extractPaginationParams(req);
        this.logAction('getAll', req, { pagination });

        const result = await this.service.findMany({}, pagination);

        return this.sendPaginatedResponse(
            res, 
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
                hasNext: result.hasNext,
                hasPrevious: result.hasPrevious
            }, 
            '${PascalName}s retrieved successfully', 
            result.data
        );
    };

    /**
     * Get single ${PascalName}
     */
    public getOne = async (req: Request, res: Response) => {
        const { id } = req.validatedParams;
        this.logAction('getOne', req, { id });

        const result = await this.service.findById(id);

        if (!result) {
            return this.sendResponse(res, '${PascalName} not found', HTTPStatusCode.NOT_FOUND);
        }

        return this.sendResponse(res, '${PascalName} retrieved successfully', HTTPStatusCode.OK, result);
    };

    /**
     * Update ${PascalName}
     */
    public update = async (req: Request, res: Response) => {
        const { id } = req.validatedParams;
        const body = req.validatedBody;
        this.logAction('update', req, { id, body });
        
        const exists = await this.service.exists({ id });
        if (!exists) {
            return this.sendResponse(res, '${PascalName} not found', HTTPStatusCode.NOT_FOUND);
        }

        const result = await this.service.updateById(id, body);
        
        return this.sendResponse(res, '${PascalName} updated successfully', HTTPStatusCode.OK, result);
    };

    /**
     * Delete ${PascalName}
     */
    public delete = async (req: Request, res: Response) => {
        const { id } = req.validatedParams;
        this.logAction('delete', req, { id });
        
        const exists = await this.service.exists({ id });
        if (!exists) {
            return this.sendResponse(res, '${PascalName} not found', HTTPStatusCode.NOT_FOUND);
        }

        await this.service.deleteById(id);
        
        return this.sendResponse(res, '${PascalName} deleted successfully', HTTPStatusCode.OK);
    };
}
`;

// 4. Routes Template
const routesTemplate = `import { Router, Request, Response } from 'express';
import { ${PascalName}Controller } from './${camelName}.controller';
import { ${PascalName}Validation } from './${camelName}.validation';
import { validateRequest } from '@/middleware/validation';
import { asyncHandler } from '@/middleware/asyncHandler';

export class ${PascalName}Routes {
    private router: Router;
    private controller: ${PascalName}Controller;

    constructor(controller: ${PascalName}Controller) {
        this.router = Router();
        this.controller = controller;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        const createValidator = validateRequest({ body: ${PascalName}Validation.create });
        const updateValidator = validateRequest({ 
            params: ${PascalName}Validation.params.id, 
            body: ${PascalName}Validation.update 
        });
        const idValidator = validateRequest({ params: ${PascalName}Validation.params.id });

        // Define Routes
        this.router.post('/', createValidator, asyncHandler((req, res) => this.controller.create(req, res)));
        this.router.get('/', asyncHandler((req, res) => this.controller.getAll(req, res)));
        this.router.get('/:id', idValidator, asyncHandler((req, res) => this.controller.getOne(req, res)));
        this.router.patch('/:id', updateValidator, asyncHandler((req, res) => this.controller.update(req, res)));
        this.router.delete('/:id', idValidator, asyncHandler((req, res) => this.controller.delete(req, res)));
    }

    public getRouter(): Router {
        return this.router;
    }
}
`;

// 5. Module Template
const moduleTemplate = `import { BaseModule } from '@/core/BaseModule';
import { ${PascalName}Service } from './${camelName}.service';
import { ${PascalName}Controller } from './${camelName}.controller';
import { ${PascalName}Routes } from './${camelName}.routes';

export class ${PascalName}Module extends BaseModule {
    public readonly name = '${PascalName}Module';
    public readonly version = '1.0.0';
    // Add dependencies if this module relies on others
    public readonly dependencies = []; 

    private service!: ${PascalName}Service;
    private controller!: ${PascalName}Controller;
    private routes!: ${PascalName}Routes;

    protected async setupServices(): Promise<void> {
        this.service = new ${PascalName}Service(this.context.prisma);
    }

    protected async setupRoutes(): Promise<void> {
        this.controller = new ${PascalName}Controller(this.service);
        this.routes = new ${PascalName}Routes(this.controller);

        this.router.use('/api/${camelName}s', this.routes.getRouter());
    }
}
`;

// --- WRITE FILES ---

const files = [
  { name: `${camelName}.validation.ts`, content: validationTemplate },
  { name: `${camelName}.service.ts`, content: serviceTemplate },
  { name: `${camelName}.controller.ts`, content: controllerTemplate },
  { name: `${camelName}.routes.ts`, content: routesTemplate },
  { name: `${PascalName}Module.ts`, content: moduleTemplate },
];

files.forEach(file => {
  const filePath = path.join(baseDir, file.name);
  fs.writeFileSync(filePath, file.content);
  console.log(`✅ Created ${file.name}`);
});

console.log(`
✨ Module ${PascalName} created successfully at src/modules/${PascalName}

👉 **Next Steps:**
1. Add the model '${PascalName}' to your 'prisma/schema.prisma' file:
   
   model ${PascalName} {
     id          String   @id @default(uuid())
     name        String
     description String?
     status      String   @default("active")
     isDeleted   Boolean  @default(false)
     deleted_at   DateTime?
     created_at   DateTime @default(now())
     updated_at   DateTime @updated_at
   }

2. Run migration:
   bunx prisma migrate dev --name add_${camelName}

3. Register the module in 'src/index.ts':
   import { ${PascalName}Module } from './modules/${PascalName}/${PascalName}Module';
   // ...
   app.registerModule(new ${PascalName}Module());
`);
