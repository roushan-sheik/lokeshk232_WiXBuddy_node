# WiXBuddy Backend

Express.js backend API for WiXBuddy platform.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL with Prisma 7
- **Language**: TypeScript

## Project Structure

```
src/
├── core/           # Core application setup, base classes, error handling
├── lib/            # Utility libraries
├── middleware/     # Express middleware
├── modules/        # Feature modules
│   ├── Auth/       # Authentication
│   ├── Cart/       # Shopping cart
│   ├── Checkout/   # Checkout process
│   ├── Contact/    # Contact management
│   ├── Event/      # Events
│   ├── Faq/        # FAQ
│   ├── Favorite/   # Favorites
│   ├── Magazine/   # Magazine content
│   ├── Reviews/    # Reviews
│   ├── Test/       # Testing module
│   └── Ticket/     # Tickets
├── services/       # Business logic services
├── types/          # TypeScript type definitions
└── utils/         # Utility functions
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:push` | Push schema to database |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Key Dependencies

- **AWS**: SES, S3, CloudFront for emails and file storage
- **Auth**: JWT, bcrypt
- **Payments**: Razorpay
- **Validation**: Zod
- **Logging**: Winston
- **Scheduling**: node-cron
