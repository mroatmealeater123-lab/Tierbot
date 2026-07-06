FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace manifest files first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy only the discord-bot package.json so pnpm can resolve the workspace
COPY artifacts/discord-bot/package.json ./artifacts/discord-bot/

# Install dependencies for the discord-bot only
RUN pnpm install --filter @workspace/discord-bot --frozen-lockfile

# Copy bot source
COPY artifacts/discord-bot ./artifacts/discord-bot

CMD ["pnpm", "--filter", "@workspace/discord-bot", "run", "dev"]
