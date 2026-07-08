FROM oven/bun:alpine
WORKDIR /app

# Expose port 7860 (Hugging Face Spaces default HTTP port)
ENV PORT 7860
ENV HOST 0.0.0.0
EXPOSE 7860

# Install dependencies
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

# Copy codebase
COPY . .

# Generate Prisma client for database operations
RUN bunx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Start the Next.js production server
CMD ["bun", "run", "start", "-p", "7860"]
