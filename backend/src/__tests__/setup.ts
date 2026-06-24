// Set required env vars before any module is loaded by the test runner
process.env.JWT_SECRET = "test-secret";
process.env.PIN_SECRET = "test-pin-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
process.env.ALLOWED_ORIGIN = "http://localhost:5173";
