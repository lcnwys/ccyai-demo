#!/bin/sh
set -e

npx prisma db push --schema prisma/schema.prisma
node dist/main.js
