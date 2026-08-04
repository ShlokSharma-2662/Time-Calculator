# API

The Express API in `server/` is optional and separate from Firebase web/mobile flows.

## Base URL

Default: `http://localhost:5000`

## Auth

All protected routes expect JWT in header:

```http
x-auth-token: <jwt>
```

## Endpoints

### `GET /`

Returns service/version message.

### `POST /api/auth/register`

Creates user and returns JWT + user details.

### `POST /api/auth/login`

Authenticates user and returns JWT + user details.

### `GET /api/logs` *(Protected)*

Returns logs for authenticated user.

### `POST /api/logs/sync` *(Protected)*

Batch upsert logs for authenticated user.

## Example usage (optional)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'
```

## Notes

- `JWT_SECRET` must be set before starting the server.
- API uses local file persistence, so state is not durable unless `data/` is retained.
- CORS is open in current implementation; restrict for production deployments.
