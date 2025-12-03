# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 py3-pip make g++ linux-headers
RUN npm install

# Production stage
FROM node:22-alpine
WORKDIR /app

# Install runtime dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Skip Puppeteer Chromium download as we installed it via apk
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
