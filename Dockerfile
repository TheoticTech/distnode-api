# BUILD STAGE
FROM node:17.4.0 as build

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies using package.json and package-lock.json
COPY package*.json ./
RUN npm ci --only=production
RUN npm install typescript@4.5.5

# Bundle app source
COPY . .

# Configure app to run in production mode
ENV NODE_ENV=production

# Execute app on port 3001
EXPOSE 3001
CMD [ "npm", "start" ]
