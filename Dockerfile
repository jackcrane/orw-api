# Base image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock files
COPY package.json ./

# Install dependencies
RUN yarn

# Copy all files
COPY . .

# Build the Prisma database and frontend
RUN yarn build_db

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]