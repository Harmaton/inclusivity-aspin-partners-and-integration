# Inclusivity Solutions -Support Engineering Assignment

## Overview

This is the **Support Engineering Technical Assignment** for **Inclusivity Solutions**. The project implements a payment integration service that bridges Aspin's core insurance platform with third-party payment providers (M-Pesa and Airtel Money).

**Assignment answers are located in the `/docs` folder.**

---

## Prerequisites

- **Node.js**: v18+ or v20+ (LTS recommended)
- **npm**: v9+ or v10+
- **Git**: For cloning the repository

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd aspin-partners
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.example` file in the root directory:
```bash
# .env.example

# Authentication
JWT_SECRET=your-jwt-secret-key

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret-key

# External APIs
ASPIN_WEBHOOK_URL=https://api.aspin.com/webhooks/payment-status

# Payment Provider URLs (for future implementation)
MPESA_API_URL=https://sandbox.safaricom.co.ke
AIRTEL_API_URL=https://openapiuat.airtel.africa
```

**Note:** The application uses a **demo Bearer token** for authentication. No JWT secret configuration is required for testing.

---

## Running the Application

### Development Mode (with hot reload)
```bash
npm run start:dev
```

The server will start at `http://localhost:3000`

### Production Mode
```bash
npm run build
npm run start:prod
```

---

## Running Tests

### Run all unit tests
```bash
npm test
```

### Run tests in watch mode (recommended for development)
```bash
npm test -- --watch
```

### Run tests with coverage report
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test payments.service.spec.ts
```

---

## API Documentation

### Access Swagger/OpenAPI Documentation

Once the application is running, open your browser and navigate to:
```
http://localhost:3000/api
```

This provides an **interactive API documentation** where you can:
- View all endpoints
- See request/response schemas
- Test endpoints directly from the browser

---

## Testing the API with cURL

### Important: Authentication Required

All `/payments/initiate` requests require a **Bearer token** in the `Authorization` header.

**Demo Bearer Token:** `aspin_partner_demo_token_2026`

---

### 1. Initiate Payment (Success)
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer aspin_partner_demo_token_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_code": "POL_ASPIN_789012",
    "amount_in_cents": 500000,
    "currency": "KES",
    "provider": "mpesa",
    "msisdn": "254712345678",
    "channel": "APIClient",
    "product_code": "PROD_HEALTH_001",
    "aspin_reference": "ASP_REF_20260211_12345"
  }'
```

**Expected Response (201 Created):**
```json
{
  "transaction_id": "TXN_123456",
  "status": "pending",
  "amount": 5000,
  "currency": "KES",
  "timestamp": "2026-02-11T12:16:37.503Z"
}
```

---

### 2. Initiate Payment - Missing Authorization (Error)
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "policy_code": "POL_ASPIN_789012",
    "amount_in_cents": 500000,
    "currency": "KES",
    "provider": "mpesa",
    "msisdn": "254712345678",
    "channel": "APIClient",
    "product_code": "PROD_HEALTH_001"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Missing Authorization header",
  "details": {
    "required_format": "Authorization: Bearer <token>"
  }
}
```

---

### 3. Initiate Payment - Invalid Amount (Error)
```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer aspin_partner_demo_token_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_code": "POL_ASPIN_789012",
    "amount_in_cents": 300000,
    "currency": "KES",
    "provider": "mpesa",
    "msisdn": "254712345678",
    "channel": "APIClient",
    "product_code": "PROD_HEALTH_001"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "InvalidAmount",
  "message": "Payment amount must be exactly KES 5,000 for policy premium",
  "details": {
    "expected_amount": 500000,
    "received_amount": 300000,
    "currency": "KES"
  }
}
```

---

### 4. Duplicate Transaction (Error)
```bash
# First request - succeeds
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer aspin_partner_demo_token_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_code": "POL_ASPIN_DUPLICATE_TEST",
    "amount_in_cents": 500000,
    "currency": "KES",
    "provider": "mpesa",
    "msisdn": "254712345678",
    "channel": "APIClient",
    "product_code": "PROD_HEALTH_001"
  }'

# Second request (same policy + msisdn) - fails
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer aspin_partner_demo_token_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_code": "POL_ASPIN_DUPLICATE_TEST",
    "amount_in_cents": 500000,
    "currency": "KES",
    "provider": "mpesa",
    "msisdn": "254712345678",
    "channel": "APIClient",
    "product_code": "PROD_HEALTH_001"
  }'
```

**Expected Response (409 Conflict):**
```json
{
  "error": "DuplicateTransaction",
  "message": "Payment already initiated for this policy and customer",
  "details": {
    "existing_transaction_id": "TXN_ASPIN_...",
    "policy_code": "POL_ASPIN_DUPLICATE_TEST",
    "msisdn": "254712345678",
    "status": "pending",
    "initiated_at": "2026-02-11T12:00:00.000Z"
  }
}
```

---

### 5. Process Webhook (Success)
```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_123456",
    "status": "completed",
    "amount": 5000,
    "currency": "KES",
    "timestamp": "2026-02-11T12:20:00Z",
    "signature": "sha256_valid_signature"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "transaction_id": "TXN_123456",
  "processed_at": "2026-02-11T12:20:01.123Z"
}
```

---

### 6. Webhook - Invalid Signature (Error)
```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_123456",
    "status": "completed",
    "amount": 5000,
    "currency": "KES",
    "timestamp": "2026-02-11T12:20:00Z",
    "signature": "invalid_signature"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "InvalidSignature",
  "message": "Webhook signature validation failed",
  "details": {
    "transaction_id": "TXN_123456"
  }
}
```

---

### 7. Webhook - Idempotency Test
```bash
# Send same webhook twice
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TXN_123456",
    "status": "completed",
    "amount": 5000,
    "currency": "KES",
    "timestamp": "2026-02-11T12:20:00Z",
    "signature": "sha256_idempotency_test"
  }'
```

**First Request Response (200):**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "transaction_id": "TXN_123456",
  "processed_at": "2026-02-11T12:20:01.123Z"
}
```

**Second Request Response (200 - Idempotent):**
```json
{
  "success": true,
  "message": "Webhook already processed (idempotent)",
  "transaction_id": "TXN_123456",
  "processed_at": "2026-02-11T12:20:01.123Z"
}
```

---

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment (development/production) | No | `development` |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `WEBHOOK_SECRET` | Webhook signature validation secret | No | `your-webhook-secret-key` |
| `ASPIN_WEBHOOK_URL` | Aspin backend webhook endpoint | No | `https://api.aspin.com/webhooks/payment-status` |
| `ASPIN_API_KEY` | API key for Aspin notifications | No | `dummy-api-key` |

---

## Assignment Deliverables

All assignment answers are documented in the `/docs` folder:

### Part 1: API Design & Documentation (30 points)
📄 **Location:** `/docs/PART1_API_DESIGN.md`
- OpenAPI/Swagger specification
- Customer registration flow design
- Design decisions and rationale

### Part 2: Integration Implementation (40 points)
📄 **Location:** `/docs/PART2_IMPLEMENTATION.md`
- Payment initiation endpoint
- Webhook processing endpoint
- Error handling implementation
- Unit tests

### Part 3: Debugging & Troubleshooting (20 points)
📄 **Location:** `/docs/PART3_BUG_ANALYSIS.md`
- Bug Report 1: Duplicate customer registrations
- Bug Report 2: Missing payment webhooks
- Root cause analysis and solutions

### Part 4: Monitoring & Observability (10 points)
📄 **Location:** `/docs/PART4_MONITORING.md`
- Key metrics to track
- Alert configuration
- Sentry error tracking strategy
- Dashboard designs (Engineers, Support, Management)

---

## Key Features Implemented

✅ **Payment Initiation** with validation and duplicate prevention  
✅ **Webhook Processing** with signature validation and idempotency  
✅ **JWT Authentication** with Bearer token support  
✅ **Retry Logic** with exponential backoff for PaymentHub calls  
✅ **Comprehensive Error Handling** (400, 401, 409, 500, 502)  
✅ **Unit Tests** with 100% coverage of critical paths  
✅ **Swagger Documentation** for easy API testing  
✅ **In-Memory Transaction Storage** 

---

## Technical Stack

- **Framework:** NestJS (Node.js/TypeScript)
- **Testing:** Jest
- **Validation:** class-validator, class-transformer
- **Documentation:** Swagger/OpenAPI (@nestjs/swagger)
- **Authentication:** JWT (@nestjs/passport, passport-jwt)

---

## Notes for Reviewers

1. **Authentication:** The app uses a demo Bearer token (`aspin_partner_demo_token_2026`) for easy testing
2. **Storage:** Uses in-memory Map for transactions
3. **External APIs:** PaymentHub and Aspin APIs are mocked/simulated
4. **Webhook Secret:** Accepts any signature starting with `sha256_` for testing purposes
5. **Assignment Focus:** Emphasis on API design, error handling, idempotency, and debugging approach

---

## License

This is a technical assignment project for Inclusivity Solutions. All rights reserved.