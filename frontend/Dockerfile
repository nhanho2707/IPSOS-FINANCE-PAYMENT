# Front-end (React + Vite). Vite 8 needs Node 20.19+ or 22.12+.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Type-checks and bundles, so a broken build fails the image instead of the running container.
RUN npm run build

EXPOSE 3000

# Vite dev server on 0.0.0.0:3000 (see vite.config.mts), as with the previous Create React App setup.
CMD ["npm", "start"]
