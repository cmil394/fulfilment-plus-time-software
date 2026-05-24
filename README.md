# FulfillmentPlus Time Software

Time tracking software for Fulfillment Plus — track, manage, and analyze time across customers, tasks, and employees.

## Features

- Employee time tracking with active timer widgets
- Customer and task management
- Reports and data exports
- Admin dashboard with role-based access (Employee, Admin, Owner)
- Kiosk mode for PIN-based clock in/out

## Local Setup

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **Database:** postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public

### Prerequisites

- Node.js
- npm
- A [Neon](https://neon.tech) PostgreSQL database (or any hosted Postgres) or a local postgres
- A [Cloudinary](https://cloudinary.com) account (for avatar uploads)

### Environment Variables

Both folders contain a `.env.sample` file. Copy each and rename to `.env`, then fill in your values.

**Backend** (`/backend/.env`):

| Variable                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `DATABASE_URL`          | Neon (or other hosted Postgres) connection string      |
| `ALLOWED_ORIGIN`        | Frontend URL allowed by CORS (e.g. your Vercel URL)   |
| `JWT_SECRET`            | Secret key for signing JWTs — use a long random string |
| `OWNER_EMAIL`           | Email for the seeded owner account                     |
| `OWNER_PASSWORD`        | Password for the seeded owner account                  |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name                             |
| `CLOUDINARY_API_KEY`    | Your Cloudinary API key                                |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret                             |

**Frontend** (`/frontend/.env`):

| Variable            | Description                                        |
| ------------------- | -------------------------------------------------- |
| `VITE_API_BASE_URL` | Backend API URL (e.g. `http://localhost:3001/api`) |

### Steps

1. Run `setup.bat` to install all dependencies
2. Run `run.bat` to start the frontend and backend in separate terminals
3. Open http://localhost:5173/ in your browser

> **Note:** These scripts are Windows-only (.bat files).

## Tech Stack

### Backend

- **Node.js**
- **TypeScript**
- **Express**
- **Prisma**
- **JWT**
- **bcrypt**

### Frontend

- **TypeScript**
- **React**
- **Recharts**
- **CSS Modules**

### Database & Services

- **PostgreSQL** via [Neon](https://neon.tech) (cloud-hosted)
- **Cloudinary** (image uploads)
