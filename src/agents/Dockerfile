# Node side of the project: bots (mineflayer + prismarine-viewer) and the minds panel.
# No secrets are baked in; keys arrive at runtime via environment variables.
FROM node:22-slim
WORKDIR /app

# `canvas` ships prebuilt binaries for linux x64/arm64 glibc, so no compiler is needed,
# but the prebuilt binary links against these shared libraries at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      libexpat1 libpixman-1-0 libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
CMD ["npm", "run", "minds"]
