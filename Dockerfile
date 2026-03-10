# ---- Base Stage ----
# Use the official Node.js 22.10.0-alpine image. Consider using LTS (e.g., node:20) for better long-term support.
# Using the official image is generally more reliable than a specific mirror.
FROM registry.cn-shanghai.aliyuncs.com/centurycloud/node:22.10.0-alpine AS base

# Set Node environment to production by default for later stages
ENV NODE_ENV=production
# Set Prisma binary mirror
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# Set npm and pnpm registries
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm
RUN pnpm config set registry https://registry.npmmirror.com

# Set the working directory
WORKDIR /app

# ---- Dependencies Stage ----
# This stage focuses on installing dependencies and benefits from caching.
FROM base AS deps

# Copy only package.json and the lockfile
COPY package.json pnpm-lock.yaml ./

# Install *all* dependencies (including devDependencies needed for build and prisma generate)
# Using --frozen-lockfile ensures consistency with the lock file
RUN pnpm install --frozen-lockfile --verbose

# ---- Builder Stage ----
# This stage builds the application code.
FROM base AS builder

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
# Copy all source code
COPY . .

# Generate Prisma client (requires schema and dependencies)
# Ensure your prisma directory is included in the COPY . . above
RUN pnpm prisma generate

# Build the application
RUN pnpm build

# Build cron scripts (compile TypeScript to JavaScript)
RUN pnpm build:scripts

# ---- Pruner Stage (Optional but Recommended) ----
# This stage removes development dependencies to reduce final image size
FROM base AS pruner

# Copy necessary files from the builder stage
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
# Copy Prisma generated files and schema/migrations if needed at runtime
# The client is usually within node_modules. Copy migrations if you run them at startup.
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma # Usually not needed if client is generated correctly
COPY --from=builder /app/prisma ./prisma
# Copy compiled cron scripts
COPY --from=builder /app/dist ./dist
# Copy startup scripts
COPY --from=builder /app/scripts ./scripts

# Install *only* production dependencies
RUN pnpm install --prod --frozen-lockfile --verbose
RUN pnpm prisma generate

# ---- Final Stage ----
# Use a slim image for the final stage if possible (e.g., alpine)
# Alpine images are much smaller but might have compatibility issues with native dependencies. Test thoroughly.
# If you encounter issues, revert to `node:22.10.0-alpine`.
FROM registry.cn-shanghai.aliyuncs.com/centurycloud/node:22.10.0-alpine AS final

# Set Node environment again (good practice)
ENV NODE_ENV=production
# Set Prisma binary mirror again (needed if prisma runs commands at startup)
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# Install LibreOffice for DOCX/DOC/TXT to PDF conversion
# Configure Alpine APK mirror for faster downloads in China
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache \
    libreoffice \
    libreoffice-common \
    font-noto-cjk \
    ttf-dejavu \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/next.config.js ./
COPY --from=builder --chown=appuser:appgroup /app/.env* ./
COPY --from=builder --chown=appuser:appgroup /app/public ./public
# Copy production dependencies and built code from the pruner stage
COPY --from=pruner --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=pruner --chown=appuser:appgroup /app/.next ./.next
COPY --from=pruner --chown=appuser:appgroup /app/package.json /app/pnpm-lock.yaml ./
# Copy Prisma files if needed at runtime (ensure correct path from pruner)
COPY --from=pruner --chown=appuser:appgroup /app/prisma ./prisma
# Copy compiled cron scripts
COPY --from=pruner --chown=appuser:appgroup /app/dist ./dist
# Copy startup scripts
COPY --from=pruner --chown=appuser:appgroup /app/scripts ./scripts

RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm
RUN pnpm config set registry https://registry.npmmirror.com

# Change ownership of the working directory
# RUN chown -R appuser:appgroup /app # Might not be needed if COPY --chown is used correctly

RUN mkdir -p /var/logs/lingang-library && chown -R appuser:appgroup /var/logs/lingang-library

# Switch to the non-root user
USER appuser

# Define the command to run the application
# Start both Next.js and cron scheduler
CMD [ "node", "scripts/start-all.js" ]