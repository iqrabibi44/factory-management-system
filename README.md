# Factory Management System

A full-stack, role-based ERP web application for managing end-to-end factory operations — inventory, purchasing, production, sales, and reporting — built as a MERN stack project (MongoDB, Express, React, Node.js).

The seed data models a **pipe manufacturing factory** (uPVC, PPRC, and HDPE pipes), but the system is generic enough to adapt to other production/manufacturing businesses.

## Features

- **Authentication & Role-Based Access Control** — JWT-based auth with four roles: `admin`, `store_manager`, `production_manager`, and `sales_manager`, each with scoped permissions.
- **Product & Model Management** — Manage products and their variants/models.
- **Inventory Management** — Track raw materials and finished goods, with low-stock threshold alerts.
- **Vendor & Purchase Management** — Manage vendors and record raw material purchases.
- **Customer & Sales Management** — Manage customers and record sales transactions.
- **Production Tracking** — Start/end production sessions, log production entries, and check raw material availability before production runs.
- **Reporting Dashboard** — Dashboard summary plus dedicated reports for sales, production, batches, waste, and inventory valuation.
- **User Management** — Admin-only user listing and role assignment.

## Tech Stack

**Frontend**
- React 18 (Vite)
- React Router
- Axios
- Tailwind CSS
- Recharts (charts/analytics)
- Framer Motion (animations)
- React Hot Toast (notifications)
- jsPDF + jsPDF-AutoTable (PDF export)

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JSON Web Tokens (JWT) for auth
- bcryptjs for password hashing

## Project Structure

```
factory-management-system/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # Route/business logic
│   ├── middleware/      # Auth & role-based authorization
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── seed.js          # Sample/demo data seeder
│   └── server.js        # App entry point
├── frontend/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── context/     # Auth context/provider
│       ├── pages/       # Route-level pages (Dashboard, Products, Inventory, etc.)
│       └── services/    # API client (Axios)
└── package.json         # Root scripts to run both apps together
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- A MongoDB instance — local or [MongoDB Atlas](https://www.mongodb.com/atlas)

### Installation

Clone the repository and install dependencies for the root, backend, and frontend:

```bash
git clone https://github.com/iqrabibi44/factory-management-system.git
cd factory-management-system
npm run install-all
```

### Environment Variables

Create a `.env` file inside the `backend/` directory with the following variables:

```env
PORT=5002
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### Seed Sample Data (optional but recommended)

Populate the database with demo users, products, vendors, customers, and inventory:

```bash
cd backend
node seed.js
```

This creates four demo accounts you can log in with:

| Role                | Email                 | Password           |
|---------------------|------------------------|---------------------|
| Admin                | admin@factory.com      | `Fms@Admin#2024`    |
| Store Manager        | store@factory.com      | `Fms@Store#2024`    |
| Production Manager   | prod@factory.com       | `Fms@Prod#2024`     |
| Sales Manager        | sales@factory.com      | `Fms@Sales#2024`    |

> ⚠️ These are sample credentials for local development only — change or remove them before any production deployment.

### Running the App

From the project root, run both the backend and frontend concurrently:

```bash
npm run dev
```

Or run them individually:

```bash
npm run backend   # starts the API on http://localhost:5002 (or your PORT)
npm run frontend  # starts the Vite dev server on http://localhost:5173
```

The frontend dev server proxies `/api` requests to the backend, so once both are running, open **http://localhost:5173** and log in with one of the seeded accounts above.

## API Overview

All endpoints are prefixed with `/api` and (except auth) require a `Bearer` JWT token in the `Authorization` header.

| Resource      | Base Route            | Notes                                      |
|---------------|------------------------|---------------------------------------------|
| Auth          | `/api/auth`            | Register, login, current user, user listing |
| Products      | `/api/products`        | CRUD + nested product models                |
| Models        | `/api/models`           | Product model CRUD                          |
| Inventory     | `/api/inventory`        | Raw materials & finished goods               |
| Vendors       | `/api/vendors`          | Vendor CRUD                                  |
| Customers     | `/api/customers`        | Customer CRUD                                |
| Purchases     | `/api/purchases`        | Record & view purchases                      |
| Production    | `/api/production`       | Session start/entry/end, availability checks |
| Sales         | `/api/sales`             | Record & view sales                          |
| Reports       | `/api/reports`           | Dashboard, sales, production, batches, waste, valuation |

## Deployment

The backend includes a `vercel.json` for deployment to [Vercel](https://vercel.com/) as a serverless Node app. Configure the same environment variables (`MONGO_URI`, `JWT_SECRET`) in your deployment platform's settings, and set the frontend's API base URL/proxy accordingly for production.

## License

No license has been specified for this project yet. Consider adding a `LICENSE` file (e.g., MIT) to clarify how others may use this code.
