#!/bin/sh
echo "Checking database directory..."
if [ ! -d "/var/lib/postgresql/data" ]; then
    mkdir -p /var/lib/postgresql/data
    chown postgres:postgres /var/lib/postgresql/data
fi
echo "Database directory ready."
