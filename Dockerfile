## BUILD stage
FROM node:17.4.0-alpine as build

# Create app directory
WORKDIR /usr/src/app

# Install all dependencies using package.json and package-lock.json
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .

# Generate build artifacts
RUN npm run build

## SERVE stage
FROM node:17.4.0-alpine as serve

# Create app directory
WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy build artifacts from build stage
COPY --from=build /usr/src/app/build /usr/src/app

# Configure app to run in production mode
ENV NODE_ENV=production

# Execute app on port 80
ENV PORT=80
EXPOSE 80
CMD ["node", "/usr/src/app/app.js"]
