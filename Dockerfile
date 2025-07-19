# use node v20 parent image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

# build typescript code
RUN npm run build

EXPOSE 3000

# Run migrations before starting the app
CMD sh -c "npx knex migrate:latest && npm start"