# Home service Dockerfile - Vue.js landing page
FROM node:20-alpine as development

WORKDIR /app

# Clear npm cache
RUN npm cache clean --force

# Copy package files
COPY package*.json ./

# Install dependencies fresh
RUN rm -f package-lock.json && npm install

# Copy source code
COPY . .

# Expose port for development
EXPOSE 7000

# Development command
CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Clear npm cache
RUN npm cache clean --force

# Copy package files  
COPY package*.json ./

# Remove any existing lockfile and install fresh with npm
RUN rm -rf node_modules package-lock.json && npm install --no-package-lock

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage  
FROM nginx:alpine as production

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
