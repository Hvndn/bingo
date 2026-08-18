# Base Node.js Image
FROM node:20-alpine

# Set Working Directory
WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose Port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Start Express Fullstack App
CMD ["npm", "start"]
