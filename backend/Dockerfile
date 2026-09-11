# Use official lightweight Node.js image
FROM node:20-bullseye-slim

# Install system dependencies: ffmpeg (required by audio pipeline), openssl (required by Prisma)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy source code
COPY . .

# Expose default backend port
EXPOSE 3001

# Start command
CMD ["npm", "start"]
