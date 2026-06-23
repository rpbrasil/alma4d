FROM mcr.microsoft.com/playwright:focal

# Create app dir
WORKDIR /usr/src/app

# Install dependencies (including dev deps for build)
COPY package*.json ./
RUN npm ci

# Store Playwright browsers in app cache (persist in image layer)
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/src/app/.cache/ms-playwright

# Copy source
COPY . .

# Ensure Playwright browsers present (image already includes them, but safe to run)
RUN npx playwright install --with-deps chromium || npx playwright install chromium || true

# Build the Next.js app
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
