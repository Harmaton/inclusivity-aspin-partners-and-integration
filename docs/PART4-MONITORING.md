# PART4: Monitoring & Observability

### Key Metrics To Track

1. Request Success Rate (%)
   - Primary health indicator. Drop below 99% indicates critical issues affecting customer payments and policy activation.
2. Response Time
   - Slow responses trigger partner timeouts and retries, causing duplicates.
3. Duplicate Transaction Rate
   - High rate indicates partner integration issues or our retry logic problems. Should be < 1% of total requests.
4. Webhook Delivery Success Rate
   - Failed webhooks = customers not activated. Critical for business SLA. Must maintain 100% (with polling fallback).
5. Payment Provider Availability
   - Tracks external dependency health. Helps identify if issues are our fault or provider's. Enables proactive partner communication.
6. Transaction Processing Time (End-to-End)
   - Measures time from initiation to webhook receipt. Long durations (>5min) indicate stuck payments needing investigation.

### Alert Configurations

1. Payment Initiation Failure Spike
    
    ```yaml
    Alert: HighPaymentFailureRate
    Condition: (payment_requests_failed / payment_requests_total) > 0.05
    Duration: 5 minutes
    Threshold: >5% failure rate
    Severity: Critical
    Notify: On-call engineer (PagerDuty) + #payments-incidents Slack
    Action: Check PaymentHub status, review error logs, engage partner if needed
   ```
2. Webhook Processing Stopped

    ```yaml
    Alert: WebhooksNotProcessing
    Condition: rate(webhooks_processed_total[5m]) == 0 AND rate(payment_requests_total[5m]) > 0
    Duration: 10 minutes
    Threshold: No webhooks processed for 10min while payments ongoing
    Severity: Critical
    Notify: On-call engineer + Backend team lead
    Action: Check endpoint health, verify PaymentHub connectivity, start manual polling
    ```

3. Slow API Response Times

    ```yaml
    Alert: SlowPaymentAPI
    Condition: histogram_quantile(0.95, http_request_duration_seconds) > 5
    Duration: 10 minutes
    Threshold: P95 latency >5s
    Severity: High
    Notify: #payments-team on Slack
    Action: Check database query performance, review application logs, consider scaling
    ```

4. High Duplicate Transaction Rate
    ```yaml
    Alert: HighDuplicateRate
    Condition: rate(duplicate_transactions_blocked_total[10m]) > 0.1
    Duration: 10 minutes
    Threshold: >10% of requests are duplicates
    Severity: High
    Notify: #integrations-team Slack
    Action: Review partner retry logic, check our response times, contact partner if needed
    ```
5. Idempotency Cache Hit Rate Increasing

    ```yaml
    Alert: IncreasingRetries
    Condition: idempotency_cache_hit_rate > 0.03
    Duration: 30 minutes
    Threshold: >3% cache hit rate
    Severity: Warning
    Notify: payments-team@aspin.com
    Action: Analyze retry patterns, check if API response times degraded
    ```

6. Provider Failed
    ```yaml
    Alert: PaymentProviderDown
    Condition: payment_hub_api_availability{provider="mpesa"} == 0
    Duration: 5 minutes
    Threshold: Provider unavailable
    Severity: Warning
    Notify: #payments-team Slack
    Action: Document outage, communicate to customers if prolonged, prepare status page update
   ```

### Sentry Error Tracking Strategy

#### Error Categorization and Rules:

- By Severity: Fatal → Error → Warning → Info
- By Source: Payment | Webhook | Integration | Database | Validation
- By Provider: M-Pesa | Airtel | PaymentHub | Internal
- By Impact: Customer-facing | Internal | Partner-facing

## Dashboard Designs

### Engineers Dashboard: System Pulse Monitor

Real-time technical view for incident response and optimization.

**Core Philosophy:**  
"Show me exactly where the fire is and how to put it out"

---

### 1. Live Transaction Stream

- Real-time transaction feed with status indicators (success, failure, pending)
- Filters: Provider (M-Pesa/Airtel), Status, Policy Code
- Click transaction to view full trace:
  Request → PaymentHub → Webhook receipt

---

### 2. Critical Metrics (Last 5 Minutes)

- Request Success Rate (target >99.5%) with trend
- P95/P99 Latency (API vs PaymentHub)
- Webhook Queue Depth (pending + processing rate)
- Idempotency Cache Hit Rate (retry detection)
- Provider Health Matrix (status + latency)

---

### 3. Error Monitoring (Sentry)

Top 5 error clusters:
- Error count (last 15 min)
- Affected transactions
- First/Last seen
- Deployment correlation timeline
- Direct Sentry link

---

### 4. Alert Command Center

- Active alerts with severity (Critical/High/Warning)
- Actions: Acknowledge, Escalate, Run Diagnostic
- Alert history with resolution tracking

---

### 5. Diagnostic Toolkit

- Trace Transaction (TXN_ID, Policy Code, MSISDN)
- Raw webhook payload viewer with signature validation
- Provider API simulator for edge-case testing

**Why it works:**  
Transaction-level visibility, direct log linkage, no context switching, fast duplicate detection (Bug Report 1).

---

## Support Dashboard: Customer Impact Console

Customer-resolution focused view.

**Core Philosophy:**  
"What do I tell the customer right now?"

---

### 1. Customer Status Lookup

Search: Policy Code, MSISDN, Transaction ID

Shows:
- Current status (Active / Pending / Failed)
- Last update timestamp
- Next expected action
- Contact Customer (pre-written SMS templates)

---

### 2. Active Incident Board

- Customer-friendly issue summaries
- Start time + ETA
- Impact counter (affected customers)
- Bulk notify action

---

### 3. Transaction Health (Last 24h)

- Success rate with daily trend
- Failed transactions table:
  Policy Code | MSISDN | Failure Reason | Time Since Failure
- Filters: Timeout, Insufficient Funds, Invalid MSISDN
- Retry button (eligible cases)
- Pending transaction counter

---

### 4. Resolution Playbook

Context-aware guidance:
- Timeout: retry after 5 minutes (SMS template)
- Duplicate: already processed (policy link)
- Webhook failure: manual check initiated (ETA provided)

---

### 5. SLA Tracker

- Time to Resolution (target <15 min)
- % transactions requiring support (target <1%)

**Why it works:**  
Translates system issues into customer actions. Provides communication tools and clear escalation paths. Handles duplicate resolution clearly (Bug Report 1).

---

### Management Dashboard: Business Health Observatory

Strategic view of business performance and risk.

**Core Philosophy:**  
"Is the business healthy and where should we invest?"

---

#### 1. Executive Summary

- Transaction volume (vs yesterday)
- Success rate (SLA status)
- Revenue processed/protected
- Active incidents status

---

#### 2. 30-Day KPI Trends

- Transaction volume (provider breakdown)
- Success rate (target band 99%+)
- Average processing time (goal <5 min)
- % transactions requiring support (target <1%)

---

#### 3. Provider Performance Comparison

Side-by-side:
- Uptime
- Average processing time
- Failure rate
- Cost impact of downtime

---

#### 4. Risk Radar

Top system risks with status:
- Duplicate transaction rate (target <1%)
- Webhook retry rate
- Provider API stability
- Watchlist metrics nearing thresholds

---

#### 5. Incident & Resolution Summary

- Monthly incident count (trend)
- Mean Time To Resolution (target <30 min)
- Root cause breakdown (External / Application / Network)
- Prevented revenue loss (duplicate prevention impact)

---

#### 6. Strategic Insights

- Provider failure comparison and traffic rebalancing signals
- Scaling recommendations based on peak correlations
- Improvement impact (e.g., duplicate reduction trend)

**Why it works:**  
Links technical performance to revenue, risk, and customer impact. Shows ROI of engineering improvements and guides investment decisions without technical complexity.