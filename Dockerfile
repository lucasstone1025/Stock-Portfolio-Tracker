# Use a small Node image
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files first to leverage docker cache
COPY package*.json ./

# Install dependencies (production)
RUN npm ci --production

# Copy app files
COPY . .

# Expose port the app listens on (update if different)
EXPOSE 3000

# Default environment
ENV NODE_ENV=production
ENV PORT=3000

# Use npm start (change to node index.js if you don't have a start script)
CMD ["npm", "start"]
