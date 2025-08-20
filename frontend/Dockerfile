# Multi-stage build for React frontend

# Development stage
FROM node:20-alpine as development
WORKDIR /app
COPY package*.json ./
RUN rm -rf node_modules package-lock.json || true
RUN npm cache clean --force || true
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
# Serve the built files instead of dev mode
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "5173"]

# Build stage
FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_ENVIRONMENT=production

# Set environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build

# Install serve for development
RUN npm install -g serve

# Development stage
FROM build as development
WORKDIR /app
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Production stage with Nginx
FROM nginx:alpine as production

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx/client_temp \
    && mkdir -p /var/cache/nginx/proxy_temp \
    && mkdir -p /var/cache/nginx/fastcgi_temp \
    && mkdir -p /var/cache/nginx/uwsgi_temp \
    && mkdir -p /var/cache/nginx/scgi_temp

# Set proper permissions
RUN chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Add health check script
RUN echo '#!/bin/sh' > /health-check.sh \
    && echo 'curl -f http://localhost:80/health || exit 1' >> /health-check.sh \
    && chmod +x /health-check.sh

# Expose port 80
EXPOSE 80

# Add health endpoint to nginx config
RUN echo 'location /health { return 200 "healthy\n"; add_header Content-Type text/plain; }' >> /etc/nginx/conf.d/default.conf

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
