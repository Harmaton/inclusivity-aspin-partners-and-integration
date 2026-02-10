FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package files (npm uses package-lock.json)
COPY package*.json package-lock.json ./

# Install dependencies with npm (frozen lockfile equivalent)
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Expose port and run
EXPOSE 3000
CMD ["node", "dist/main"]