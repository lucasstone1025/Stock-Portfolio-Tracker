# Build Stage for React
FROM node:20-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Production Stage for Node.js
FROM node:20-alpine
WORKDIR /usr/src/app

# Install Python and dependencies (for backend scripts)
RUN apk add --no-cache python3 py3-pip
COPY server/requirements.txt ./
# Use --break-system-packages as we are in a container
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Copy Backend Dependencies
COPY server/package*.json ./
RUN npm ci --production

# Copy Backend Code
COPY server/ .

# Copy Built React App to Backend's Public Folder
# We copy to 'public' because that's what express.static uses in index.js
COPY --from=client-build /app/client/dist ./public

# Create data directory for scripts
RUN mkdir -p /usr/src/app/public/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_PATH=/usr/bin/python3
ENV SCRIPT_PATH=/usr/src/app/scripts/get-json-stock-data.py

CMD ["npm", "start"]
