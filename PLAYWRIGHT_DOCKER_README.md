# Playwright-ready Docker image for alma4d

This repo includes a `Dockerfile` based on the official Playwright image to run the Next.js app with browsers preinstalled.

Quick usage (build and run locally):

```bash
# build
docker build -t alma4d:playwright .

# run (exposes port 3000)
docker run --rm -p 3000:3000 alma4d:playwright
```

Publishing to GitHub Container Registry:

- The included GitHub Actions workflow `build-and-push-image.yml` builds and pushes `ghcr.io/<owner>/alma4d:latest` on `main` branch pushes.
- Ensure repository `Packages` permissions allow `write` for `GITHUB_TOKEN` (workflow sets `packages: write`).

Deploying to Azure App Service (Custom Container):

1. Push the image to a registry (GHCR or ACR).
2. In App Service -> Container settings, set image to `ghcr.io/<owner>/alma4d:latest` and save.
3. Restart the App Service.

Notes:

- The Playwright base image already includes the required system libraries to run headless browsers — this avoids the missing-shared-libs issue on App Service.
- The Dockerfile runs `npm ci` and `npm run build` during image build. If you need faster rebuilds, consider using multi-stage caching or building in CI and copying artifacts.
