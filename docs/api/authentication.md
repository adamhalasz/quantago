---
id: rest-api-authentication
slug: /api/authentication
sidebar_label: Authentication
description: How authentication works for Quantago's REST API.
---

# Authentication

Quantago uses Better Auth for application authentication and resolves the current user on protected routes through a session middleware.

## Mental Model

- auth endpoints live under `/api/auth/*`
- successful sign-in establishes a session
- protected API routes expect the session cookie on subsequent requests
- `GET /api/session` is the simplest way to verify that the session is valid

## Public vs Protected

These routes are public:

- `/api/auth/*`
- `/api/health`
- `/api/market-data/*`

Everything else in the main application API requires an authenticated user, unless a route is explicitly wired for admin secret access.

## Checking the Active Session

```bash
curl https://api.quantago.co/api/session \
  -b cookies.txt
```

Example response:

```json
{
  "session": {
    "id": "session_123"
  },
  "user": {
    "id": "user_123",
    "email": "trader@example.com",
    "role": "user"
  }
}
```

If the cookie is missing or expired, `user` will not be present on protected route access and the API returns `401 Unauthorized`.

## Browser Clients

If you are integrating from a browser app:

- rely on the existing Better Auth flow for sign-in and sign-out
- make sure requests include credentials
- make sure the backend trusts the deployed frontend origin in production

## Server-to-Server Calls

Most product routes are not designed as token-first server APIs. If you are building server-side automation around user data, you usually want to authenticate as a user session or operate through admin/infrastructure endpoints you control.

## Admin and Ingestion Access

Admin UI routes require the authenticated user to have the `admin` role.

The ingestion subsystem also supports secret-based access through the `x-ingestion-admin-secret` header when configured. That is intended for operational workflows, not general application traffic.