# Use a small Node image
FROM node:20-alpine

WORKDIR /usr/src/app

#Install Python and pip
RUN apk add --no-cache python3 py3-zip

#Install python dependencies
COPY requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

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
ENV PYTHON_PATH=/usr/bin/python3
ENV SCRIPT_PATH=/usr/src/app/scripts/get-json-stock-data.py


# Use npm start (change to node index.js if you don't have a start script)
CMD ["npm", "start"]
