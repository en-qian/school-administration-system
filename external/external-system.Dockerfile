################### Start of main image building
FROM node:12-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy all the required file for transpiling to js
COPY . ./

# Install node dependencies - done in a separate step so Docker can cache it
RUN npm ci

EXPOSE 5000

CMD ["node", "server.js"]
