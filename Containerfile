FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

COPY . .

# Generate Prisma client
RUN cd server && npx prisma generate

EXPOSE 3001 5173

# Push schema to DB then start both services
CMD ["sh", "-c", "cd /app/server && npx prisma db push --skip-generate && cd /app && npm run dev"]
