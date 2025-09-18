# Mini Drive

## Overview

Mini Drive is a simple file storage and sharing application built with Node.js. It allows users to register/login, create folders, upload files (stored locally and optionally on Cloudinary), share folders via time-limited links, and download files. The backend uses Express and Prisma for database management, with a basic HTML/JS frontend for interaction.

## Features

User authentication (register, login, logout) using Passport.js.
Folder creation, deletion, and listing.
File uploads to specific folders, with storage on local disk and Cloudinary.
Secure file downloads (via local path or Cloudinary URLs).
Time-limited sharing of folders via unique tokens.
Basic frontend for managing folders and files.
Prisma-based session storage for secure sessions.
CORS support for frontend-backend communication.

Tech Stack

Backend: Node.js, Express.js, Prisma (with PostgreSQL), Passport.js (Local Strategy), Multer (for file uploads), Cloudinary (for cloud storage).
Frontend: Plain HTML, JavaScript, CSS.
Database: PostgreSQL (compatible with Neon).
Other: bcrypt for password hashing, UUID for unique IDs.

Prerequisites

Node.js (v18+ recommended).
PostgreSQL database (local or cloud like Neon).
Cloudinary account (for cloud file storage).
Git (for cloning the repository).

Installation

Clone the repository:
``
git clone <https://github.com/yourusername/mini-drive.git>
cd mini-drive
``

Install dependencies:
``
npm install
``
Set up Prisma:

Create a PostgreSQL database.
-Add your database URL to .env (see Environment Variables below).
-Generate Prisma client and push schema:
``
npx prisma generate
npx prisma db push
``
(Optional) Set up Cloudinary: Create an account and add API keys to .env.

Environment Variables
Create a .env file in the root directory with the following:

``
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
SESSION_SECRET=your-strong-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=<http://localhost:3000>  # Update to production URL
NODE_ENV=development  # Set to 'production' for prod
PORT=3000  # Optional, defaults to 3000
``

-Generate SESSION_SECRET with: openssl rand -hex 32.

## Usage

Start the server:

Development: npm run dev (uses Nodemon).
Production: npm start.

Open <http://localhost:3000> in your browser.

Register or login.
Create folders, upload files, share, and download.

For shared folders: Use the generated share URL (e.g., `http://localhost:3000/index.html?token=uuid`).

## Deployment

Using Koyeb and Neon

Neon (Database):

Create a Neon project and database.
Copy the connection string as DATABASE_URL.

Koyeb (Hosting):

Push your code to GitHub.
In Koyeb: Create app from GitHub repo.
Set build to Nixpacks or Dockerfile (if added).
Add env vars (from above, with NODE_ENV=production).
Deploy; Koyeb provides a URL (e.g., <https://your-app.koyeb.app>).
Update FRONTEND_URL in Koyeb vars to the deployed URL.

Note: In production, ensure HTTPS is used (Koyeb handles it). Migrations run via npx prisma db push in start script.

## Contributing

Contributions are welcome! Fork the repo, make changes, and submit a pull request.

## License

MIT License. See LICENSE for details.
