# Ave — Retail Sales & Inventory Management System

**Ave** is an enterprise-grade, cash-first **Retail Sales & Inventory Management System** built for small, medium, and multi-branch retail businesses.

Designed around operational speed, financial precision, and offline tolerance, Ave provides high-performance POS checkout capabilities, append-only auditable ledgers, cashier shift reconciliation, customer store credit tracking, thermal receipt printing, and hardware drawer management without hard-coded payment gateway lock-ins.

---

## 🏪 Target Retail Businesses & Industry Applications

Ave is designed to serve a wide range of retail enterprises, single shops, and multi-branch store networks:

- 👗 **Fashion Boutiques & Clothing Stores**: Apparel, footwear, jewelry, and fashion accessories using custom SKUs and barcodes.
- 🛒 **Grocery Stores, Provisions & Supermarkets**: High-volume packaged foods, beverages, daily consumer goods, and multi-tax retail items.
- 🍔 **Food Vendors, Bakeries & Quick-Service Kiosks**: Fast cashier checkout for snack counters, bakeries, cafes, food stalls, and takeaway outlets.
- 📱 **Electronics & Mobile Gadget Shops**: Computers, phones, accessories, spare parts, and home appliances.
- 💊 **Pharmacies & Cosmetic Outlets**: Over-the-counter medicines, beauty products, skincare, and personal hygiene items.
- 📚 **Stationery & Bookstores**: School supplies, books, office stationery, and art materials.
- 🔧 **Hardware Stores & Auto Parts**: Spare parts, building tools, electrical supplies, and plumbing materials.
- 📦 **Wholesale Distributors & General Merchants**: Multi-warehouse inventories, bulk quantity retail, and store credit debt ledgers.

---

## 🌟 Key Features

- **Cash-First POS Checkout Engine**: High-speed checkout with live barcode scanner listener, custom SKU lookup, sub-unit decimal monetary math (`Decimal(12, 4)`), and cashier discount permissions enforcement.
- **Real-Time WebSockets Engine (Socket.io)**: Instant event broadcasting (`sale:created`, `stock:updated`, `shift:updated`, `expense:added`) syncing POS terminals, stock levels, and financial dashboards across connected devices without manual page reloads.
- **Configurable Retail Tax & Multi-Currency Engine**: Full support for Ghana Retail Tax standards (VAT 15%, NHIL 2.5%, GETFund 2.5%) and multi-currency display (`GHS`, `USD`, `EUR`).
- **Multi-Branch & Multi-Warehouse Architecture**: Single business enterprise (`1-to-N`) multiple retail branches, warehouses, and register terminals with an instant Header Branch Switcher.
- **Authentication & Sign-Up**: Complete Login and Business Registration (Sign-Up) system with role-based access control (`OWNER`, `ADMIN`, `MANAGER`, `CASHIER`) paired with toggleable **Module Override Switches**.
- **Cashier Shifts & Reconciliation**: Float opening controls, non-sale cash movements (`CASH_IN` / `CASH_OUT`), and automated drawer reconciliation formula:
  $$\text{Expected Cash} = \text{Opening Float} + \text{Cash Sales} + \text{Cash In} - \text{Cash Out}$$
- **Alert UI & Toast Notifications**: Beautiful animated toast stack (`success`, `error`, `warning`, `info`) with auto-dismissal.
- **Dual Mode Thermal Receipt Engine**: Browser native `@media print` 80mm receipt preview + direct ESC/POS binary command builder + WebSerial RJ12 cash drawer pulse trigger (`[0x1B, 0x70, 0x00, 0x19, 0xFA]`).
- **Store Credit Ledger**: Customer directory with double-entry debt accounting (`CREDIT_SALE`, `DEBT_PAYMENT`).
- **Offline Tolerance & Idempotency**: IndexedDB queue (Dexie.js) paired with client-generated UUID `idempotencyKey` values to prevent duplicate sales or stock deductions on network reconnection.
- **Theme & Responsiveness**: Dynamic **Light & Dark Theme** toggle paired with a mobile drawer menu, fully responsive across smartphones, tablets, and POS terminals.

---

## 📁 Monorepo Folder Structure

The project is structured into clear `backend`, `frontend`, and shared `packages` directories:

```text
ave-retail/
├── .agents/rules/
│   └── changelog.md           # Mandatory rule requiring CHANGELOG updates on code edits
├── backend/
│   ├── api/                   # Express.js REST API Server + Socket.io (Port 4890)
│   │   ├── src/
│   │   │   ├── controllers/   # Auth, Catalog, Sales, Shifts, Customer, Expense, Report Controllers
│   │   │   ├── middleware/    # Auth, RBAC, Idempotency, Error Handler
│   │   │   ├── routes/        # Auth, Catalog, Sales, Shifts, Customer, Expense, Report Routes
│   │   │   ├── services/      # DB Singleton, Sales Engine, Shifts, Catalog, Socket Server
│   │   │   └── server.ts      # Server bootstrap (Port 4890)
│   │   └── package.json
│   └── prisma/
│       ├── schema.prisma      # MySQL Database Schema with Decimal precision
│       └── seed.ts            # Seed script (Org, Branch, Users, Tax, Products)
│
├── frontend/
│   ├── web/                   # Vite + React 18 SPA Web Application (Port 5173)
│   │   ├── src/
│   │   │   ├── components/    # Header, Sidebar, AlertToast UI primitives
│   │   │   ├── features/      # POS, Catalog, Shifts, Customers, Reports, Auth
│   │   │   ├── hardware/      # Thermal Printer & Cash Drawer drivers
│   │   │   ├── lib/           # ApiClient, Dexie.js Offline DB, Socket Client
│   │   │   └── store/         # Cart, Auth, Alert, Theme Zustand stores
│   │   └── package.json
│   ├── ios/                   # (Future) Native iOS Application Workspace
│   └── android/               # (Future) Native Android Application Workspace
│
├── packages/
│   ├── config/                # Permissions registry & default tax rates
│   ├── shared/                # Financial math, tax calculator, receipt formatters
│   ├── types/                 # Domain interfaces, DTOs, API payloads
│   └── validation/            # Zod & request payload validation schemas
│
├── .env                       # Local Environment configuration (Git ignored)
├── .env.example               # Environment Variables template
├── .gitignore                 # Excluded files and folders
├── CHANGELOG.md               # Product version history
├── package.json               # Root monorepo workspace scripts
└── README.md                  # Project documentation
```

---

## 🚀 Setup & Execution Guide

Follow these steps to set up and run the Ave Retail project locally.

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MySQL Database**: Local WAMP, XAMPP, Docker, or native MySQL server running on `localhost:3306`

---

### Step 1: Clone the Repository & Install Dependencies

Clone the repository and install all root and workspace package dependencies:

```bash
# Clone the repository (if applicable)
git clone <repository-url>
cd ave-retail

# Install all monorepo dependencies and link local packages
npm install
```

---

### Step 2: Environment Configuration

Create your `.env` configuration file from the provided `.env.example` template:

```bash
# Copy template to .env
cp .env.example .env
```

Open `.env` and verify your configuration (Unique Backend Port `4890`):

```env
# Server Port (Unique Port 4890)
PORT=4890
NODE_ENV="development"

# MySQL Connection String (mysql://USER:PASSWORD@HOST:PORT/DATABASE_NAME)
DATABASE_URL="mysql://root:@localhost:3306/ave_retail"

# Secret Key for JWT Tokens
JWT_SECRET="ave-retail-super-secret-jwt-key-2026"
```

> **Note**: Make sure your local MySQL server (e.g. WAMP Server) is running and the database `ave_retail` exists (or Prisma will automatically create it during `db:push`).

---

### Step 3: Database Setup & Seeding

Sync the database schema using Prisma and seed initial demo data:

```bash
# Generate Prisma Client types
npm run db:generate

# Push schema directly to the MySQL database
npm run db:push

# Seed the database with organization, branch, products, and default accounts
npm run db:seed
```

---

### Step 4: Run All Services (Single Command)

You can launch both the **Backend API Server (Port 4890)** and **Web Frontend SPA (Port 5173)** concurrently using a single terminal command:

```bash
# Single command to start all services concurrently with color-coded logs
npm run dev

# Or using the alias command:
npm run dev:all
```

#### Individual Service Commands (Optional)
If you prefer running services in separate terminal windows:
- **Backend API (Port 4890)**: `npm run dev:api`
- **Web Frontend (Port 5173)**: `npm run dev:web`

Open [`http://localhost:5173`](http://localhost:5173) in your browser.

---

## 🔑 Demo Login Credentials

Once the database is seeded, log in using the following accounts:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Cashier** | `cashier@ave.com` | `cashier123` | POS Sales, Shift Open/Close, Cash Movements |
| **Store Manager** | `manager@ave.com` | `manager123` | Sales, Shifts, Inventory, Customers, Expenses, Reports |
| **Admin / Owner** | `admin@ave.com` | `admin123` | Full Access, Catalog, Inventory, Reports, Users, Branches |

---

## 📍 System Web Routes & Application Pages Directory

The Web Application (`http://localhost:5173`) features modular role-based navigation with the following application pages:

| Page / Navigation Link | Internal ID | Description | Authorized Access |
| :--- | :--- | :--- | :--- |
| **Home / Overview** | `landing` | High-level enterprise dashboard showing real-time sales metrics, quick shortcuts, active shift status, and system status | All Roles |
| **POS Checkout** | `pos` | High-speed POS register terminal supporting barcode scanning, cart calculations, customer credit sales, and thermal receipt printing | Owner, Admin, Manager, Supervisor, Cashier |
| **Cashier Shifts** | `shifts` | Shift lifecycle management for float opening, cash movements (CASH_IN/OUT), shift closure, and drawer reconciliation | Owner, Admin, Manager, Supervisor, Cashier |
| **Products & Stock** | `inventory` | Catalog management for product SKUs, barcodes, cost/selling prices, low-stock reorder alerts, and stock intake/damage adjustments | Owner, Admin, Manager, Supervisor, Inventory Officer |
| **Customer Debt Ledger** | `customers` | Store credit account ledger tracking customer debt balances, credit sales history, and debt repayments | Owner, Admin, Manager, Supervisor, Cashier, Accountant |
| **Store Expenses** | `expenses` | Overhead cost tracking for logging rent, utility bills, salaries, packaging, and freight for accurate operating profit calculations | Owner, Admin, Manager, Accountant |
| **Reports & Analytics** | `reports` | Financial statements, net operating profit, tax liabilities, payment method breakdown, and multi-branch performance comparison tables | Owner, Admin, Manager, Supervisor, Accountant |
| **My Account Profile** | `profile` | User identity view displaying user details, assigned RBAC roles, enterprise information, security credentials, and module permissions | All Authenticated Users |
| **Staff & Branch Admin** | `admin` | Enterprise administration for managing staff user accounts, editing staff permissions, transferring staff between store branches, adding store outlets, and updating business profile branding | Owner, Admin |

---

## 🌐 API Endpoint & Real-Time Routes Reference

Below is a complete list of all Express REST API endpoints and Socket.io WebSocket events provided by the backend service (`http://localhost:4890/api/v1`):

### 🔐 Authentication & Staff Administration (`/api/v1/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Registers a new business enterprise, main store branch, primary warehouse, and owner account |
| `POST` | `/api/v1/auth/login` | Authenticates staff credentials, returning user profile, JWT token, branch context, and permission switches |
| `GET` | `/api/v1/auth/profile` | Fetches the current authenticated user's profile details, assigned roles, and module access rights |
| `PATCH` | `/api/v1/auth/profile` | Updates authenticated user's personal profile (full name, phone number) or updates password |
| `GET` | `/api/v1/auth/users` | Retrieves list of all staff accounts registered under the business enterprise |
| `POST` | `/api/v1/auth/users` | Creates a new staff member account (Cashier, Manager, Supervisor) with role presets and permissions |
| `PATCH` | `/api/v1/auth/users/:id` | Updates a staff member's name, phone, branch assignment, role presets, permission switches, or active status |
| `DELETE` | `/api/v1/auth/users/:id` | Permanently deletes a staff member account from the enterprise system |
| `GET` | `/api/v1/auth/branches` | Retrieves list of all registered retail store branches for the business |
| `POST` | `/api/v1/auth/branches` | Creates a new store branch outlet location |
| `PATCH` | `/api/v1/auth/branches/:id` | Updates branch details (name, phone, address) |
| `PATCH` | `/api/v1/auth/business` | Updates business profile (name, tagline, TIN, phone, address, logo, active/inactive status) |
| `DELETE` | `/api/v1/auth/business` | Performs a cascading purge of the business enterprise and all associated records |

### 📦 Product Catalog & Stock Inventory (`/api/v1/catalog`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/catalog/products` | Retrieves product catalog with SKUs, barcodes, categories, prices, and stock balances (supports `?query=`) |
| `POST` | `/api/v1/catalog/products` | Creates a new product and variant record |
| `POST` | `/api/v1/catalog/stock-adjust` | Logs stock inventory adjustments (stock-in, damage, correction, transfer) |

### 🛒 Sales & POS Register Checkout (`/api/v1/sales`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sales` | Processes a POS checkout transaction with sub-unit decimal math, tax calculation, and idempotency check |
| `GET` | `/api/v1/sales` | Retrieves historical sales transactions list with receipt details |

### ⏱️ Cashier Shifts & Till Drawer (`/api/v1/shifts`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/shifts/active` | Retrieves the active open cashier shift for a register terminal |
| `POST` | `/api/v1/shifts/open` | Opens a new cashier shift with an initial cash float amount |
| `POST` | `/api/v1/shifts/close` | Closes a cashier shift, logging actual cash in drawer and calculating variance |
| `POST` | `/api/v1/shifts/movement` | Logs non-sale cash movements (`CASH_IN` / `CASH_OUT`) for petty cash or float additions |

### 👥 Customer Debt Ledger (`/api/v1/customers`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/customers` | Retrieves customer directory with current outstanding store credit balances |
| `POST` | `/api/v1/customers` | Creates a new customer account |
| `POST` | `/api/v1/customers/payment` | Logs a debt repayment or credit note entry against a customer ledger |

### 💵 Store Operating Expenses (`/api/v1/expenses`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/expenses` | Retrieves logged store operating expenses (rent, utilities, salaries, transport) |
| `POST` | `/api/v1/expenses` | Logs a new store operating expense entry |
| `DELETE` | `/api/v1/expenses/:id` | Deletes an expense entry |

### 📊 Financial Reports & Analytics (`/api/v1/reports`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/reports/summary` | Returns gross revenue, net sales, tax liabilities, expenses, net operating profit, and per-branch comparisons (`?branchId=all` or `?branchId=xxx`) |

### ⚡ Real-Time WebSocket Channel Events (`socket.io`)

| Channel Event | Event Description |
| :--- | :--- |
| `sale:created` | Broadcasts live POS checkout sales across terminals without page reloads |
| `stock:updated` | Broadcasts instant stock balance changes to inventory screens |
| `shift:updated` | Broadcasts cashier shift opening, closing, and drawer float updates |
| `expense:added` | Broadcasts new store expense entries to financial dashboards |

---

## 🛠️ Available npm Commands

Below is a reference of all root npm scripts available in the workspace:

| Command | Description |
| :--- | :--- |
| `npm run dev` | **Runs all services** (API Port 4890 & Web Port 5173) concurrently in a single terminal |
| `npm run dev:all` | Alias for `npm run dev` to launch all services |
| `npm run dev:api` | Starts the Express backend API server (Port 4890) in development mode |
| `npm run dev:web` | Starts the React SPA frontend development server (Port 5173) via Vite |
| `npm run build:api` | Compiles the TypeScript backend API |
| `npm run build:web` | Compiles and builds the production Web frontend bundle |
| `npm run db:generate` | Generates the Prisma Client JS bindings |
| `npm run db:push` | Pushes the Prisma schema to the target MySQL database |
| `npm run db:seed` | Runs the database seed script (`backend/prisma/seed.ts`) |
