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
