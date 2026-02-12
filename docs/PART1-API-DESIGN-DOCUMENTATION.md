# TASK 1 : API Design and Documentation.

## OpenAPI Specification Location

For reference, the complete OpenAPI 3.1.0 specification for this API is available at:
File Path: `./openapi-spec.json` and you can access the Interactive Swagger Documentation: `http://localhost/api/docs`.
The  Source Code Implementation: `src/customer-management/` module.

## API Design Philosophy

### 1. Why REST?
This API follows REST architectural principles considering the following benefits:

- Stateless: Each request contains all necessary authentication `(Bearer token)`
- Layered system: Clear separation of concerns between client, API gateway, and PartnerCRM
- Cacheable: Responses can be cached based on HTTP semantics

### 2. Why these Status Codes?
Below is a list of the status codes used and their rationale.

- `200 OK`: Acknowledgement Pattern for a successful asynchronous registration.
- `400 Bad Request`: Client validation error (invalid MSISDN format, missing required fields)
- `401 Unauthorized`: Missing/invalid authentication token or Invalid webhook signature
- `404 Not Found`: Customer GUID not found in webhook processing
- `409 Conflict`: Duplicate customer (MSISDN or external_identifier already exists)
- `500 Server Error`: Error from my service

### 3. Authentication Method

The API uses the bearer token authentication:

```
security:
- bearer: []
```

- Type: `OAuth 2.0 Bearer Token`
- Header: `Authorization: Bearer <token>`
- Scope: Partner-level authentication (each partner has unique GUID + token)

This is also the standard `ASPIN API` authentication method to create a customer and it can be easily revoked/rotated ensuring scalability.











