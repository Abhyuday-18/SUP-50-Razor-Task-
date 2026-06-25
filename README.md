# Razorpay Reimbursements API

A node-based Express backend project implementing role-based workflows and employee hierarchy mappings using Drizzle ORM and PostgreSQL.

## 📁 Project Setup & Running
All commands should be executed from the `razorpay-reimbursements/` directory:

1. **Install Dependencies:**
   ```bash
   cd razorpay-reimbursements
   npm install
   ```
2. **Migrations:** Generates migration files from schemas and runs them against your PostgreSQL DB.
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
3. **Seeding CFO User:** Adds the default CFO account required for administrative tasks.
   ```bash
   npm run db:seed-data
   ```
4. **Start Dev Server:** Starts the Express app on port `7002` with nodemon.
   ```bash
   npm run dev
   ```

---

## 🚀 Port & Configuration
* **Port:** Runs on port `7002` (configurable via `PORT` in `.env`).
* **Session Auth:** Uses an `httpOnly` cookie named `token` containing the signed JWT payload.

---

## 👥 Roles & Hierarchy
The application defines 4 distinct roles:
1. `EMP` (Employee) — Default role for all newly registered users.
2. `RM` (Reporting Manager) — Manages assigned employees.
3. `APE` (Accounts Payable Team) — Reviews reimbursements.
4. `CFO` (Chief Financial Officer) — Controls assignments, routes, and roles.

---

## 📖 Endpoint Reference

### 🔐 1. Auth Module (`/rest/onboardings`)

#### **Register User**
* **Method:** `POST`
* **Path:** `/rest/onboardings/register`
* **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@org.com",
    "password": "mySecurePassword"
  }
  ```
* **Validations:**
  * Only email addresses ending with `@org.com` are allowed. Other domains return `400 Bad Request`.
  * Email must be unique. Duplicate emails return `400 Bad Request`.
* **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "userId": "d3b07384-d113-49cd-a5d6-8ee37119e990",
      "name": "John Doe",
      "email": "john@org.com",
      "role": "EMP"
    }
  }
  ```

#### **Login**
* **Method:** `POST`
* **Path:** `/rest/onboardings/login`
* **Request Body:**
  ```json
  {
    "email": "john@org.com",
    "password": "mySecurePassword"
  }
  ```
* **Success Response (200 OK):**
  * Sets cookie: `token=<JWT_TOKEN>; HttpOnly; SameSite=Lax`
  ```json
  {
    "status": "success",
    "data": {
      "userId": "d3b07384-d113-49cd-a5d6-8ee37119e990",
      "name": "John Doe",
      "email": "john@org.com",
      "role": "EMP"
    }
  }
  ```

#### **Logout**
* **Method:** `POST`
* **Path:** `/rest/onboardings/logout`
* **Success Response (200 OK):**
  * Clears cookie: `token`
  ```json
  {
    "status": "success",
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```

---

### 🛡️ 2. Roles Module (`/rest/roles`)

#### **Assign Role**
* **Method:** `POST`
* **Path:** `/rest/roles/assign`
* **Authorization:** **CFO only** (requires `token` cookie).
* **Request Body:**
  ```json
  {
    "userId": "uuid-of-user",
    "role": "RM"
  }
  ```
* **Validations / Features:**
  * Assigning the `CFO` role is blocked (`400 Bad Request`).
  * If assigning the same role the user already holds, returns `400 Bad Request`.
  * **Role Downgrade:** If a user holding `RM` role is changed to `EMP` or `APE`, all employee manager relationship rows for this manager are automatically deleted from the database.
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "userId": "uuid-of-user",
      "name": "John Doe",
      "email": "john@org.com",
      "role": "RM"
    }
  }
  ```

---

### 👔 3. Employees Module (`/rest/employees`)

#### **Get Employees (Role-Based Visibility)**
* **Method:** `GET`
* **Path:** `/rest/employees`
* **Authorization:** **RM**, **APE**, or **CFO** (requires `token` cookie). Regular `EMP` returns `403 Forbidden`.
* **Behavior:**
  * **RM:** Returns list of only the `EMP` users assigned directly under them.
  * **APE:** Returns list of all `EMP` and `RM` users.
  * **CFO:** Returns list of all users in the system.
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "users": [
        {
          "userId": "uuid-of-user",
          "name": "John Doe",
          "email": "john@org.com",
          "role": "EMP"
        }
      ]
    }
  }
  ```

#### **Assign Reporting Manager**
* **Method:** `POST`
* **Path:** `/rest/employees/assign`
* **Authorization:** **CFO only** (requires `token` cookie).
* **Request Body:**
  ```json
  {
    "empId": "uuid-of-employee",
    "rmId": "uuid-of-manager"
  }
  ```
* **Validations:**
  * `empId` and `rmId` must be valid UUID formats.
  * `empId` must belong to a user with the `EMP` role.
  * `rmId` must belong to a user with the `RM` role.
  * Same-user assignment is blocked.
  * If employee is already assigned to a manager, returns `400 Bad Request`.
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "message": "Employee assigned successfully"
    }
  }
  ```

#### **Remove Reporting Manager Assignment**
* **Method:** `DELETE`
* **Path:** `/rest/employees/assign`
* **Authorization:** **CFO only** (requires `token` cookie).
* **Request Body:**
  ```json
  {
    "empId": "uuid-of-employee",
    "rmId": "uuid-of-manager"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "message": "Assignment removed successfully"
    }
  }
  ```

---

### 🧾 4. Reimbursement Module (`/rest/reimbursements`)

#### **Create Reimbursement**
* **Method:** `POST`
* **Path:** `/rest/reimbursements`
* **Authorization:** **EMP only** (requires `token` cookie).
* **Request Body:**
  ```json
  {
    "title": "Taxi Fare",
    "description": "Travel to client office",
    "amount": 1500
  }
  ```
* **Validations:**
  * `title`, `description`, and `amount` are required.
  * `amount` must be a positive number.
* **Success Response (201 Created):**
  ```json
  {
    "status": "success",
    "data": {
      "reimbursementId": "uuid-here",
      "title": "Taxi Fare",
      "description": "Travel to client office",
      "amount": "1500",
      "status": "PENDING"
    }
  }
  ```

#### **Get Reimbursements (Role-Based Visibility)**
* **Method:** `GET`
* **Path:** `/rest/reimbursements`
* **Authorization:** **EMP**, **RM**, **APE**, or **CFO** (requires `token` cookie).
* **Behavior:**
  * **EMP:** Returns all of their own reimbursements.
  * **RM:** Returns pending reimbursements from employees assigned under them.
  * **APE:** Returns pending reimbursements where `rm_approved = true` (waiting for APE gate).
  * **CFO:** Returns fully approved and rejected reimbursements (for audit).
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "reimbursements": [
        {
          "reimbursementId": "uuid-here",
          "title": "Taxi Fare",
          "description": "Travel to client office",
          "amount": "1500",
          "status": "PENDING"
        }
      ]
    }
  }
  ```

#### **Get Reimbursements for Employee**
* **Method:** `GET`
* **Path:** `/rest/reimbursements/:userId`
* **Authorization:** **RM**, **APE**, or **CFO** (requires `token` cookie). Regular `EMP` returns `403 Forbidden`.
* **Behavior:**
  * Returns all reimbursements for the target employee (`:userId`).
  * Target user must have the `EMP` role.
  * **RM** can only view if the employee is assigned to them.
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "reimbursements": [
        {
          "reimbursementId": "uuid-here",
          "title": "Taxi Fare",
          "description": "Travel to client office",
          "amount": "1500",
          "status": "PENDING"
        }
      ]
    }
  }
  ```

#### **Update Reimbursement Status (Approve or Reject)**
* **Method:** `PATCH`
* **Path:** `/rest/reimbursements`
* **Authorization:** **RM**, **APE**, or **CFO** (requires `token` cookie). Regular `EMP` returns `403 Forbidden`.
* **Request Body:**
  ```json
  {
    "userId": "uuid-of-employee",
    "reimbursementId": "uuid-of-reimbursement",
    "status": "APPROVED"
  }
  ```
  *(Note: `status` can be `"APPROVED"` or `"REJECTED"`)*
* **Validations / Business Rules:**
  * `userId`, `reimbursementId`, and `status` are required in request body.
  * Inputs must be in valid UUID format.
  * Checks that the reimbursement exists and belongs to the given `userId`.
  * **Rejection Finality:** If the status is already `"REJECTED"`, returns `400 Bad Request` with `"Reimbursement has already been rejected"`.
  * **Dual Approval Workflow:**
    * **RM:** If `status = "APPROVED"`, sets `rm_approved = true`. Checks if `ape_approved` is already true. If so, updates status to `"APPROVED"`.
    * **APE:** Only acts if `rm_approved = true` and `ape_approved = false`. If `status = "APPROVED"`, sets `ape_approved = true`. Checks if `rm_approved` is also true. If so, updates status to `"APPROVED"`.
    * **CFO sequential overrides:** Acts based on which gate is incomplete. If `rm_approved = false`, CFO action fills the RM gate. If `rm_approved = true` and `ape_approved = false`, CFO action fills the APE gate.
  * Every action logs an entry in `reimbursement_approvals` table.
* **Success Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "message": "Reimbursement status updated"
    }
  }
  ```

