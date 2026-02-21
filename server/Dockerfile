# Build stage
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
RUN npm install

# Production stage
FROM node:22-bookworm-slim
WORKDIR /app



# Copy source code
COPY . .

# Copy node_modules from builder
# We do this AFTER copying source code to ensure potential local node_modules
# (if not ignored) are overwritten by the correct built ones.
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["npm", "run", "dev"]
