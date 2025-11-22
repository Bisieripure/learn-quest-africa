# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directory for database
RUN mkdir -p /app/data

# Initialize database using compiled JavaScript
RUN node dist/db/init.js

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/index.js"]
