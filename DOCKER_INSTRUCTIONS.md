# Docker Deployment Instructions

This project is now ready to be deployed using Docker.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1. **Build and Start the containers**:
   ```bash
   docker-compose up -d --build
   ```

2. **Access the application**:
   - Backend API: `http://localhost:3000/api`
   - Frontend: `http://localhost:3000` (The server serves both)

## Configuration

The environment variables are managed in the `docker-compose.yml` file. You can adjust the following:

- `POSTGRES_PASSWORD`: The password for the database.
- `DB_PASSWORD`: Should match the one above.
- `PORT`: The port the application will listen on.

## Volumes
- `pgdata`: Keeps your database data persistent.
- `./server/uploads`: Persists uploaded visitor photos on your host machine.
- `./server/.cert`: If you want to use HTTPS, place your `key.pem` and `cert.pem` here.

## Viewing Logs
To see what's happening inside the containers:
```bash
docker-compose logs -f app
```

## Stopping the App
```bash
docker-compose down
```
