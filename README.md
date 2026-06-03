# Cash Management App

Single-page web app for managing cash boxes and box transactions (receipt/payment) using React + Node.js + MongoDB.

## Features

- Cash box CRUD (create, read, update, delete)
- Transaction CRUD for each box
- Login with username + password (JWT-based)
- Admin page to create new users
- Each user can only view/manage their own cash boxes and transactions
- Transaction types:
  - `receipt` (incoming cash)
  - `payment` (outgoing cash)
- Real-time balance recalculation
- Arabic RTL modern UI
- Render deployment config via `render.yaml`

## Project Structure

- `client`: React + Vite frontend
- `server`: Express + Mongoose API
- `render.yaml`: Render blueprint for backend + static frontend

## Local Setup

1. Install backend dependencies:

```bash
cd server
npm install
```

2. Configure backend env:

- Copy `server/.env.example` to `server/.env`
- Fill `MONGODB_URI` with your MongoDB connection string
- Set `JWT_SECRET` to a strong random value
- Optional admin seed values:
  - `ADMIN_USERNAME` (default: `admin`)
  - `ADMIN_PASSWORD` (default: `admin1234`)

3. Start backend:

```bash
cd server
npm run dev
```

4. Install frontend dependencies and run:

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:5000`

## Login

- First run creates one admin account automatically if there are no users.
- Default credentials (if not overridden by env):
  - Username: `admin`
  - Password: `admin1234`
- Change these values immediately in production via environment variables.

## API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/users` (admin only)
- `POST /api/auth/users` (admin only)
- `GET /api/boxes`
- `POST /api/boxes`
- `PUT /api/boxes/:id`
- `DELETE /api/boxes/:id`
- `GET /api/boxes/:boxId/transactions`
- `POST /api/boxes/:boxId/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

## Deploy on Render

1. Push project to GitHub.
2. In Render, create a new Blueprint and select this repository.
3. Render reads `render.yaml` and provisions:
   - `cash-management-api` (Node web service)
   - `cash-management-client` (Static Site)
4. Set `MONGODB_URI` in Render environment variables for backend service.
5. Update these values if you choose different service names:
   - `FRONTEND_URL` in backend service
   - `VITE_API_URL` in frontend static service

## Notes

- Balance formula:
  - `currentBalance = openingBalance + sum(receipts) - sum(payments)`
- Deleting a box removes all related transactions.
