# PART 3: Bug Report Analysis

---

# Bug Report 1: Duplicate Customer Registrations from PartnerCRM

**Subject:** Duplicate customer registrations  
**Example:**  
Customer ID: `CUST_7890`  
Requests received at: 10:30:15, 10:30:17, 10:30:19

---

## 1. Possible Root Causes

- Missing idempotency handling (no `Idempotency-Key` validation)
- Slow API responses causing partner retries
- No unique database constraint on `customer_id`
- Aggressive retry logic without exponential backoff
- Concurrent processing race condition

---

## 2. Questions to Ask

### PartnerCRM

- Are you sending an `Idempotency-Key` header?
- What is your retry policy (timeout, retries, backoff)?
- Under what conditions do you retry?
- Can you share raw request logs (including headers)?
- What HTTP response codes did you receive from us?

### Aspin Backend

- What is the P95/P99 response time for registration?
- Do we validate idempotency keys?
- Is there a unique constraint on `customer_id`?
- Are we responding before DB commit completes?
- Any recent schema or deployment changes?

---

## 3. Logs & Data to Check

### Application Logs

- Incoming registration requests (timestamps + headers)
- Response times
- HTTP status codes returned
- Duplicate insert attempts

### Database

- Multiple rows with same `customer_id`
- Transaction isolation level
- Insert timing collisions

### Infrastructure

- API gateway logs (timeouts, 504 errors)
- Load balancer retry behavior

---

## 4. Investigation Steps

1. Identify affected customer (`CUST_7890`).
2. Retrieve full request logs for the three timestamps.
3. Compare:
    - Payload hash
    - Headers
    - Idempotency keys
4. Check HTTP responses returned.
5. Review server latency at that time.
6. Inspect DB write behavior (atomicity, constraints).
7. Check for gateway timeouts.
8. Reproduce by simulating delayed DB response and rapid retries.

---

## 5. Solution & Prevention Strategy

### Immediate

- Implement `Idempotency-Key` support (store key + response)
- Add unique DB constraint on `customer_id`
- Ensure atomic DB transactions

### Short-Term

- Return `409 Conflict` for duplicates
- Add structured logging for idempotency validation
- Align retry expectations with PartnerCRM

### Long-Term

- Enforce exponential backoff retries
- Add duplicate registration monitoring alert
- Use distributed locking (e.g., Redis) if high concurrency

---

# Bug Report 2: Missing Payment Webhooks

**Subject:** 15 payments initiated, only 8 webhooks received  
**Impact:** Policy activation blocked

---

## 1. Possible Root Causes

- Webhook delivery failure (network/firewall issues)
- Endpoint downtime
- Signature validation failure
- No retry mechanism from PaymentHub
- Incorrect HTTP status returned (4xx/5xx)
- Silent processing errors after receipt
- Misconfigured webhook URL

---

## 2. Questions to Ask

### PaymentHub

- Do you retry failed webhook deliveries? How many times?
- What HTTP status codes did you receive?
- Can you provide webhook delivery logs for the 7 transactions?
- What is your timeout configuration?
- Do you log signature generation details?

### Aspin Backend

- Was `/api/payments/webhook` fully operational during that period?
- Are webhook receipt and processing logged separately?
- Any signature validation failures?
- What status codes are returned?
- Do we have reconciliation or polling fallback?

---

## 3. Logs & Data to Check

### Application Logs

- Incoming registration requests (timestamps + headers)
- WebHook Secret Keys
- HTTP status codes returned
- Duplicate Webhook Processing being attempted


#### Step 1: Identify the 7 missing webhooks
 - Use the appropriate query language to identify structure of the webhooks.

#### Step 2: Check if webhooks were received but failed
```bash
# Search logs for the 7 transaction IDs

# Outcome:
# - Found in logs → processing failed
# - Not found → never delivered
```

#### Step 3: Test webhook endpoint (5 min)
```bash
# Verify endpoint is reachable and responding
curl -X POST https://webhookurl.com/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TEST_123",
    "status": "completed",
    "amount": 5000,
    "currency": "KES",
    "timestamp": "2026-02-12T10:00:00Z",
    "signature": "sha256_test"
  }'

# Expected: 200 or 401 (signature validation)
# Bad: Timeout, connection refused, 5xx
```

#### Step 4: Check PaymentHub delivery logs (request partner data)

**Step 5: Reproduce the issue (15 min)**
```bash
# Send test payment and verify webhook receipt
# Monitor logs in real-time
```

---

## 5. Solution & Prevention

### Immediate Fix

#### Solution 1: Webhook Polling Fallback
Add a cron Job for this

#### Solution 2: Improve Error Handling**
Improved logging and error handling can assist in tracking error logs much faster.

---

### Short-Term 

#### Solution 3: Add Monitoring Alert

Add alerts for various categories just based off the webhooks received

#### Solution 4: Request PaymentHub Changes
- Enable exponential backoff retries: 30s, 1min, 5min, 15min, 1hr
- Retry on 5xx and timeouts
- Don't retry on 4xx (except 429 rate limit)
- Provide webhook delivery status API

---


