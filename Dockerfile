# Stage 1: Build the application
FROM oven/bun:1 AS builder

WORKDIR /app

# --------------------------------------------------------
# FIX: Install OpenSSL in BUILDER stage so Prisma can detect the correct target
# --------------------------------------------------------
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# Copy package definition files
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma Client
# (We removed the ENV variable; Prisma will now auto-detect debian-openssl-3.0.x because OpenSSL is installed)
RUN bun x prisma generate

# Copy the rest of the source code
COPY . .

# Build the TypeScript code
RUN bun run build

# Stage 2: Production Runner
FROM oven/bun:1-slim AS runner

# Install OpenSSL (Required for Prisma at runtime)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Copy static assets
COPY --from=builder /app/email-templates ./email-templates
# COPY --from=builder /app/certificate-template ./certificate-template

EXPOSE 3030

CMD ["bun", "dist/index.js"]