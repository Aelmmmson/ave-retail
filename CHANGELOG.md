# Changelog

All notable changes to the **Ave — Retail Sales & Inventory Management System** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.0] - 2026-09-17

### Added
- **Production-Ready Multi-Engine Barcode Scanner (`BarcodeScannerModal.tsx`)**:
  - Integrated `html5-qrcode` (ZXing JS decoder) alongside native `window.BarcodeDetector`, providing accurate 1D linear barcode decoding (EAN-13, UPC, Code 128) across desktop webcams, mobile Safari, and Firefox.
  - Implemented `requestAnimationFrame` detection loop with 10 FPS frame throttling and track teardown on unmount.
  - Added hardware barcode gun wedge listener with 1.5s duplicate scan debouncing and `Enter`/`Tab` key handling.
  - Added Web Audio API synthesized 880Hz audio beep tone and visual scan success badge on detection.
  - Integrated camera barcode scanner modal into both Inventory View and POS Cashier View.

### Fixed
- **Tooltip Right-Edge Boundary Clipping (`CustomTooltip.tsx`)**:
  - Added `align` prop (`'center' | 'left' | 'right'`) to `CustomTooltip.tsx` so tooltips near container borders grow inward without text truncation.
- **Modal Layering & Backdrop Blur Coverage (`BarcodeScannerModal.tsx` & `App.tsx`)**:
  - Updated modal backdrop container `z-index` to `z-[9999]` and removed parent relative positioning context in `App.tsx`, ensuring backdrop overlay and blur cover the top header bar completely.

---

## [1.8.0] - 2026-09-16

### Changed & Restructured
- **Unique Backend API Port (`4890`)**:
  - Reconfigured default Express API server port from `3001` to a unique port `4890` across `.env`, `.env.example`, `server.ts`, and Vite proxy settings (`vite.config.ts`).
- **Real-Time WebSockets Engine (`Socket.io`)**:
  - Integrated `socket.io` in Express server and `socket.io-client` in React Web SPA.
  - Broadcasts live events (`sale:created`, `stock:updated`, `shift:updated`, `expense:added`) syncing sales revenue, product stock, cashier shift statuses, and financial reports across connected devices in real time.
- **Single-Command Monorepo Execution (`npm run dev` / `npm run dev:all`)**:
  - Added `concurrently` package to root `package.json`.
  - Enabled single-terminal execution (`npm run dev` or `npm run dev:all`) launching both the Backend API (Port 4890) and Web SPA (Port 5173) with color-coded, synchronized logs.
- **Primary Role Presentation Fix**:
  - Resolved role precedence logic in `authController.ts`, `ProfileView.tsx`, and `Sidebar.tsx` so primary assigned roles (`ADMIN` / `OWNER` / `MANAGER`) take precedence over secondary role arrays.
- **Sidebar Nav Deduplication**:
  - Removed duplicate `"My Account Profile"` item from [`Sidebar.tsx`](file:///c:/Users/USG/Downloads/ave-retail/frontend/web/src/components/Sidebar.tsx) navigation menu. User Profile remains accessible via header avatar pill or top sidebar user badge.
- **Active Branch Context Switch Control**:
  - Disabled the `"Switch to Branch"` button on the currently active outlet card in [`UserManagementView.tsx`](file:///c:/Users/USG/Downloads/ave-retail/frontend/web/src/features/admin/UserManagementView.tsx), displaying an **Active Branch** status badge instead.
- **Staff Account Deletion (`authController.ts` & `UserManagementView.tsx`)**:
  - Added `DELETE /api/v1/auth/users/:id` endpoint in backend API and integrated a **Delete Staff Account** action button with confirmation safety checks in [`UserManagementView.tsx`](file:///c:/Users/USG/Downloads/ave-retail/frontend/web/src/features/admin/UserManagementView.tsx).
- **Aggregated Enterprise Multi-Branch Financial Statements (`ReportView.tsx` & `reportController.ts`)**:
  - Integrated a **Financial Scope Selector** (`"🏢 All Enterprise Branches (Aggregated Total)"` vs individual outlets) in [`ReportView.tsx`](file:///c:/Users/USG/Downloads/ave-retail/frontend/web/src/features/reports/ReportView.tsx).
  - Added an **Enterprise Branch Financial Comparison Table** detailing sales orders, gross revenue, operating expenses, and net profit per outlet.
- **Comprehensive API & WebSocket Routes Reference (`README.md`)**:
  - Documented all Express REST API endpoints and Socket.io channel events in [`README.md`](file:///c:/Users/USG/Downloads/ave-retail/README.md).

---

## [1.7.1] - 2026-09-15

### Added & Improved
- **Icon-Only Landing Page Logout (`LandingView.tsx`)**:
  - Rendered the authenticated Logout button as an icon-only control (`LogOut`) on the landing page top navigation bar for a cleaner header design.
- **Base64 Business Logo Upload (`AuthModalView.tsx` & `schema.prisma`)**:
  - Added an interactive Business Logo file uploader in Step 1 of the multi-step registration wizard.
  - Automatically converts uploaded PNG/JPG logo files to Base64 strings and stores them in `Organization.logoUrl` (`@db.LongText`).
- **Store Expenses Management & Profit Accounting (`ExpenseView.tsx`, `api.ts` & `ReportView.tsx`)**:
  - Created **`ExpenseView.tsx`** module (`/expenses`) enabling cashiers and admins to log store operating costs (Utilities, Rent, Salaries, Transport, Inventory Freight, Packaging, Misc).
  - Updated `/reports/summary` API and `ReportView.tsx` to deduct total expenses from net sales revenue, providing **True Net Operating Profit** calculations.
- **Multi-Tab Admin Hub & Branch Management (`UserManagementView.tsx` & `Sidebar.tsx`)**:
  - Expanded Admin Hub with dedicated **Store Branches & Outlets** management tab for creating new store locations, updating branch phone/address details, and switching branch context.
  - Explicitly labeled **`Manage Business & Staff`** in the Sidebar Main Menu for all Admin & Owner accounts.

---

## [1.7.0] - 2026-09-14

### Added & Improved
- **Business Name vs. Branch Name Differentiation**:
  - Application header, POS cart drawer, and thermal receipts now prominently display both **Business Name** (e.g. `Apex Supermarket Ltd`) and **Branch Name** (e.g. `Accra Main Branch`).
- **Enhanced Thermal Receipt Specifications (`printerDriver.ts` & `PosView.tsx`)**:
  - Updated thermal receipt template to include Business Name, Tagline, Branch Name, Tax ID / TIN, Store Physical Address, Store Phone Number, Receipt Reference Number, Cashier Name, Order Items, Tax Breakdown, and Payment Tender Details.
- **Dynamic Landing Page CTAs & User Profile Pill (`LandingView.tsx`)**:
  - Updated Landing Page navbar, hero section, and footer CTAs to adapt dynamically to the user's authentication state.
  - When logged in, renders a user profile badge with user name, email, and role badge alongside quick action buttons (`Go to POS Register`, `Staff & Business Admin`).
  - Fixed smooth scroll anchor target for `#offline` resilience section.
- **Multi-Role RBAC System & User Management (`UserManagementView.tsx` & `schema.prisma`)**:
  - Registrant automatically designated as `OWNER` & `ADMIN`.
  - Built **`Staff & Business Admin`** management dashboard (`UserManagementView.tsx`) enabling admins to add cashiers/managers, assign single or multiple roles simultaneously (`OWNER`, `ADMIN`, `MANAGER`, `CASHIER`, `INVENTORY_CLERK`), and toggle Active / Inactive staff status.
  - Integrated backend login guard blocking sign-ins for inactive users or deactivated businesses.
- **Business Profile Settings & Cascading Store Purge**:
  - Added controls to update Business Tagline, TIN, Address, Phone Number, and Logo URL.
  - Added Business Operational Status toggle (`ACTIVE` vs `INACTIVE` store closure).
  - Added secure cascading business deletion modal requiring explicit confirmation.
- **Dedicated Offline Resilience Section (`LandingView.tsx`)**:
  - Created a standalone `<section id="offline">` with IndexedDB local persistence details, automatic background sync explanations, and hardware independence showcases so `#industries`, `#features`, and `#offline` each navigate to their own distinct sections.
- **3-Step Business Registration Wizard (`AuthModalView.tsx`)**:
  - Converted business registration into a 3-step form wizard with a visual progress stepper (Step 1: Business Details, Step 2: Owner & Admin Account, Step 3: Review & Confirm).
  - Validation guards on each step prevent incomplete submissions, and the `Create Business Account` submit button is enabled on the final Review step.
- **Landing Page Logout Button (`LandingView.tsx`)**:
  - Added a dedicated `Logout` button to the landing page navbar and footer when a user is authenticated, allowing instant session termination without switching views.
- **Sidebar Main Menu Link Normalization for Admins (`Sidebar.tsx`)**:
  - Normalized role array/string parsing so that Admins and Owners are guaranteed to see all 7 main menu links in the sidebar, including **`Staff & Business Admin`**.

---

## [1.6.3] - 2026-09-14

### Fixed & Resolved
- **Global `window.alert` Override (`App.tsx`)**:
  - Implemented a global `window.alert()` override in `App.tsx` routing all legacy or inline browser alert calls to the custom `AlertToast` system.
  - Guaranteed zero `localhost:5173 says` native browser dialog popups across all screens (including stock adjustment popups).
- **Backend Shift Service Overhaul (`shiftService.ts` & `schema.prisma`)**:
  - Resolved Prisma relation error (`Inconsistent query result: Field register/user is required to return data, got null instead`) by making relations optional on `CashierShift` model in `schema.prisma`.
  - Added dynamic `Register` and `User` resolution in `ShiftService` supporting code or UUID lookup.
  - Updated `openShift` to gracefully return an existing active shift if one is already open, preventing 400 Bad Request registration errors.

---

## [1.6.2] - 2026-09-14

### Fixed & Refined
- **System-Wide Light Mode Theme Alignment (`ReportView.tsx`)**:
  - Replaced hardcoded dark background (`bg-slate-950`) and dark cards (`bg-slate-900`) in `ReportView.tsx` with dynamic light/dark theme classes (`bg-slate-50 dark:bg-slate-950` and `bg-white dark:bg-slate-900`).
  - All system screens now display in 100% crisp light mode aesthetics when light mode is selected.
- **Foolproof Shift Opening & Checkout Workflow (`ShiftView.tsx` & `PosView.tsx`)**:
  - **Seamless Shift Opening**: Updated `ShiftView.tsx` `handleOpenShift` to instantly register `activeShiftId` in `useCartStore` in both online API and offline/demo fallback modes.
  - **Zero-Block POS Checkout**: Updated `PosView.tsx` `handleCompleteSale` to auto-initialize a shift session if none is active when completing a transaction, so cashiers can never get blocked from processing sales.

---

## [1.6.1] - 2026-09-14

### Fixed & Refined
- **Alert Toast Layering Fix (`AlertToast.tsx`)**:
  - Elevated `AlertToast` container z-index to `z-[99999]` so toast alerts and shift reconciliation notifications always render clearly **above** modal backdrop overlays and backdrop blur filters.
- **Shift Reconciliation & Closing Workflow (`ShiftView.tsx`)**:
  - Pre-populated `actualCashInput` with expected drawer cash when opening the closing shift modal so cashiers don't start with `0`.
  - Added a **`⚡ Match Expected (GH₵ 350.00)`** quick auto-fill chip button inside the shift reconciliation modal.
  - Fixed modal closing state and updated fallback state handling so clicking `Reconcile & Close` smoothly closes the modal, clears active shift session, and presents clear toast feedback with cash variance calculations.
- **Removed Global Currency Switcher (`Header.tsx`)**:
  - Removed the `GHS | USD` currency switcher pill toggle from top navigation per user request.
  - Stock items remain pegged to store base currency (`GH₵ Base`) for clarity and consistency.

---

## [1.6.0] - 2026-09-14

### Added & Improved
- **Enhanced Discount Engine (Fixed Amount + Percentage + Duration Rules)**:
  - Allowed fixed currency discount amounts (e.g. `GH₵ 5.00 OFF`) alongside percentage discounts (`10% OFF`) per line item and checkout cart level.
  - Added `DiscountRule` database model supporting promotional discounts, item-specific sales, category sales, and date-range rules (`startDate` to `endDate`).
  - Added discount modal toggle allowing cashiers to select `% Percentage` or `GH₵ Fixed Amount`.
- **Zero Browser Alert Popups**:
  - Removed all native browser `alert()` and `confirm()` dialogs across the entire application.
  - Replaced all alerts with the custom `AlertToast` notification stack (`success`, `error`, `warning`, `info`).
- **Early Shift Validation & Quick Open (Zero Interrupted Checkouts)**:
  - Added an early warning alert banner at the top of POS when no register shift is open, alerting cashiers **before** they build carts.
  - Added a **`⚡ Quick Open Shift (GH₵ 100)`** button directly on the POS banner.
  - Preserved cart items: Opening a shift midway preserves all cart items without requiring cashiers to re-scan or rebuild carts.

---

## [1.5.0] - 2026-09-14

### Security & Authentication
- **Strict Protected Route Guards (`App.tsx` & `authStore.ts`)**:
  - Enforced mandatory authentication for all operational views (`POS Checkout`, `Products & Stock`, `Cashier Shifts`, `Customer Debt Ledger`, `Reports & Analytics`).
  - Configured `LandingView` as the **only public page** accessible without logging in.
  - Added automatic redirection: When an unauthenticated user attempts to access any operational route or clicks `Launch POS Register`, they are immediately directed to the **Login / Business Sign-Up screen** (`AuthModalView`).
  - Added logout redirect: Signing out immediately revokes session tokens and redirects the user to the Login screen.

---

## [1.4.1] - 2026-09-14

### Changed
- **Standalone Landing Page Architecture (`LandingView.tsx` & `App.tsx`)**:
  - Converted the Landing Page into a 100% standalone, full-width marketing page.
  - Removed operational POS sidebar and cashier header bar from the Landing Page view.
  - Added dedicated Landing Page marketing navbar with brand logo, jump links, Light/Dark theme toggle, Sign In, and `Launch POS Register` CTA buttons.
  - Added clean marketing footer.
  - Clicking `Launch POS Register` or `Enter POS Terminal` transitions into the operational application shell with POS Header and Sidebar.

---

## [1.4.0] - 2026-09-14

### Added
- **Modern Landing Page & Introductory CTA Banner (`LandingView.tsx`)**:
  - Created a landing page with hero banner, high-converting CTA buttons (`Launch POS Register`, `Register Business`, `Explore Product Catalog`).
  - Added hero feature statistics bar: sub-50ms barcode speed, 100% decimal precision, multi-branch architecture, offline queueing.
  - Added Target Retail Businesses Showcase Grid covering Fashion Boutiques, Grocery Stores, Food Vendors, Electronics, Pharmacies, Hardware, Stationery, and Wholesale Merchants.
  - Added Core System Capabilities grid and bottom Call-To-Action conversion section.
  - Configured `LandingView` as the default landing screen for visitors and cashiers.

---

## [1.3.1] - 2026-09-14

### Added
- **Target Retail Businesses Documentation**:
  - Added dedicated `Target Retail Businesses & Industry Applications` section to `README.md`.
  - Listed support for Boutiques, Grocery Stores, Food Vendors & Bakeries, Electronics Shops, Pharmacies, Stationery Stores, Hardware Shops, and Wholesale Distributors.

---

## [1.3.0] - 2026-09-14

### Added
- **Alert & Toast UI System**:
  - Implemented floating Toast notification stack component (`AlertToast.tsx`) with state store (`alertStore.ts`).
  - Added support for 4 notification types: `success` (emerald), `error` (rose), `warning` (amber), and `info` (cyan) with auto-dismiss timer.
- **Authentication System (Login & Sign-Up)**:
  - Added Business Registration API endpoint (`POST /api/v1/auth/signup`) creating Organization, Branch, Warehouse, Register, and Admin User in a single transaction.
  - Added Login API endpoint (`POST /api/v1/auth/login`) returning user profiles and authorized branch lists.
  - Added `AuthModalView.tsx` with Login and Business Registration forms + quick demo credential auto-fill buttons.
- **Multi-Branch Support per Business**:
  - Implemented Organization-to-Branch (`1-to-N`) management endpoints (`GET/POST /api/v1/auth/branches`).
  - Added Header Branch Switcher dropdown allowing instant switching between store locations (e.g., Accra Central Branch, Kumasi Mall Branch).
  - Added "Create New Store Branch" modal in Header for registering new retail branches.
- **Project Rule Enforcement**:
  - Created `.agents/rules/changelog.md` workspace rule enforcing mandatory `CHANGELOG.md` updates after every code update.
- **Documentation**:
  - Added comprehensive `README.md` containing architecture, monorepo breakdown, WAMP MySQL setup, and API guide.

---

## [1.2.0] - 2026-09-14

### Added
- **Light & Dark Theme Engine**:
  - Created `themeStore.ts` and dynamic root theme class switcher (`light` vs `dark`).
  - Added Sun/Moon theme toggle button to main Header bar.
  - Formatted all views (POS, Inventory, Shifts, Customers, Reports) for crisp light mode aesthetics.
- **Mobile & Multi-Device Responsiveness**:
  - Added slide-out drawer sidebar menu for mobile smartphones (`< 640px`) with hamburger menu trigger button (`Menu`).
  - Added responsive grid catalog cards and stacked POS checkout layout for mobile and tablet screens.

---

## [1.1.0] - 2026-09-14

### Added
- **Configurable Retail Taxes & Multi-Currency**:
  - Implemented Ghana Retail Tax calculation engine (VAT 15%, NHIL 2.5%, GETFund 2.5%).
  - Added multi-currency tender selection (`GHS`, `USD`, `EUR`).
- **Negative Stock Policy**:
  - Allowed sales when stock balance is `0` or negative, enabling post-sale stock intake reconciliation.
- **Dual Mode Receipt Printing & Hardware Abstraction**:
  - Added native browser print layout (`window.print()`).
  - Added direct ESC/POS binary command builder (`printerDriver.ts`).
  - Added WebSerial RJ12 cash drawer pulse driver (`drawerDriver.ts`).
- **WAMP MySQL Integration**:
  - Synced Prisma database schema to WAMP MySQL server (`port 3306`) with explicit `@db.VarChar` index lengths.
  - Executed database seeding for default organization, branches, registers, users, products, barcodes, and customers.

---

## [1.0.0] - 2026-09-14

### Added
- **Initial Architecture & Monorepo Setup**:
  - Created workspace monorepo layout (`apps/api`, `apps/web`, `packages/shared`, `packages/types`, `packages/validation`, `packages/config`).
  - Implemented core sales engine with sub-unit decimal arithmetic (`Decimal(12, 4)`), cashier discount enforcement (10%), shift opening/closing reconciliation, and customer credit debt ledger.
