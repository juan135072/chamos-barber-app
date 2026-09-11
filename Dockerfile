# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Limit Node heap to avoid OOM kill during Next.js compilation
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time public env vars (injected by Coolify as ARGs)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_ONESIGNAL_APP_ID
ARG NEXT_PUBLIC_INSFORGE_BASE_URL
ARG NEXT_PUBLIC_INSFORGE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_ONESIGNAL_APP_ID=$NEXT_PUBLIC_ONESIGNAL_APP_ID
ENV NEXT_PUBLIC_INSFORGE_BASE_URL=$NEXT_PUBLIC_INSFORGE_BASE_URL
ENV NEXT_PUBLIC_INSFORGE_ANON_KEY=$NEXT_PUBLIC_INSFORGE_ANON_KEY

# Install dependencies first (cached layer)
COPY package*.json ./
COPY vendor ./vendor
RUN npm ci --include=dev --prefer-offline

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production image — only what's needed to run
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Only copy the standalone output + static assets (~20MB vs ~500MB)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
