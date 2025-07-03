FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Expose the app port
EXPOSE 3002

# Start the app
CMD ["node", "dist/index.js"]
