# Authentication & Session Management Guide — ErogaAI SaaS

## Overview

ErogaAI SaaS implements production-grade multi-tenant authentication using bcrypt password hashing, HttpOnly secure cookies, and strict server-side session resolution.

## Endpoints

### 1. Register New Organization (`POST /api/auth/register`)
- **Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "SecurePassword123!",
    "name": "Juan Pérez",
    "company_name": "AllSender SRL",
    "rnc": "131-89241-2",
    "phone": "+1 (809) 555-0199",
    "country": "Dominican Republic",
    "accept_terms": true
  }
  ```
- **Response**: Sets `eroga_session` HttpOnly cookie and creates user, organization, main company, and ADMIN role.

### 2. Login (`POST /api/auth/login`)
- **Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: Verifies bcrypt hash, issues session token in HttpOnly cookie.

### 3. Get Authenticated User (`GET /api/auth/me`)
- **Headers/Cookie**: Automatically reads `eroga_session` cookie.
- **Response**: Returns current user object and organization. Never defaults to dummy users.

### 4. Logout (`POST /api/auth/logout`)
- Clears session cookie and invalidates session token in server memory/database.

## Security Practices
- Password minimum length: 8 characters.
- Hashing: `bcrypt` with salt round 10.
- Cookies: `HttpOnly: true`, `SameSite: Lax`, `Secure` in production.
- Strict `req.organization_id` context injection — frontend cannot spoof organization IDs.
