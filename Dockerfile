# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build client and server
RUN npm run build
RUN npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files for production deps
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Cloud Run uses PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "dist-server/server.js"]
