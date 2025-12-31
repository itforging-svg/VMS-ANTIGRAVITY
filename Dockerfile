# Stage 1: Build the Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Final Image (Postgres + Node + Supervisor)
FROM postgres:15-alpine

# Install Node.js, supervisor, and build dependencies
RUN apk add --no-cache nodejs npm python3 make g++ supervisor

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy the rest of the server code
COPY server/ ./

# Copy built frontend from Stage 1
COPY --from=client-builder /app/client/dist /app/client/dist

# Build the server (TypeScript to JavaScript)
RUN npm run build

# Setup Supervisor and Scripts
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisord.conf
COPY local-db-init.sh /app/local-db-init.sh
RUN chmod +x /app/local-db-init.sh

# Environment Variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_NAME=vms_db
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV POSTGRES_DB=vms_db
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV TZ=Asia/Kolkata
# Trust local connections for simplicity in this container
ENV POSTGRES_HOST_AUTH_METHOD=trust

# Expose the application port
EXPOSE 3000

# Start Supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
