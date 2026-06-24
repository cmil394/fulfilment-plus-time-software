import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

// vi.mock is hoisted before imports — these replace the real modules before
// any route/service/controller ever loads them.
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../middleware/rate-limiting.middleware", () => ({
  loginLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  writeLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  readLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import app from "../app";
import { generateToken, encryptPin } from "../utils/auth";
import { prisma } from "../lib/prisma";

// Typed shorthand for the mocked user model methods
const db = prisma.user as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// Shared fixtures computed once
let hashedPassword: string;
let encryptedPin: string;

beforeAll(async () => {
  hashedPassword = await bcrypt.hash("password123", 10);
  encryptedPin = encryptPin("1234");
});

beforeEach(() => {
  vi.clearAllMocks();
});

// POST /api/auth/register
describe("POST /api/auth/register", () => {
  it("returns 201 with a PENDING user on valid registration", async () => {
    db.findUnique.mockResolvedValue(null);
    db.create.mockResolvedValue({
      id: "new-user-id",
      email: "new@test.com",
      fullName: "John Doe",
      firstName: "John",
      lastName: "Doe",
      employeeCode: "4321",
      role: "Employee",
      status: "PENDING",
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "new@test.com",
      password: "password123",
      confirmPassword: "password123",
      firstname: "John",
      lastname: "Doe",
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user.email).toBe("new@test.com");
    expect(res.body.data.user.status).toBe("PENDING");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 409 when the email is already taken", async () => {
    db.findUnique.mockResolvedValue({
      id: "existing",
      email: "taken@test.com",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "taken@test.com",
      password: "password123",
      confirmPassword: "password123",
      firstname: "Jane",
      lastname: "Doe",
    });

    expect(res.status).toBe(409);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 when passwords do not match", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "new@test.com",
      password: "password123",
      confirmPassword: "different456",
      firstname: "John",
      lastname: "Doe",
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  it("returns 400 for an invalid email format", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "password123",
      confirmPassword: "password123",
      firstname: "John",
      lastname: "Doe",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "new@test.com",
      password: "short",
      confirmPassword: "short",
      firstname: "John",
      lastname: "Doe",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "new@test.com",
    });

    expect(res.status).toBe(400);
  });
});

// POST /api/auth/login
describe("POST /api/auth/login", () => {
  it("returns 200 with a JWT token for valid credentials", async () => {
    db.findUnique.mockResolvedValue({
      id: "user-id",
      email: "user@test.com",
      password: hashedPassword,
      fullName: "John Doe",
      firstName: "John",
      lastName: "Doe",
      employeeCode: "1234",
      role: "Employee",
      status: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe("user@test.com");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 401 when the email is not registered", async () => {
    db.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@test.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when the password is wrong", async () => {
    db.findUnique.mockResolvedValue({
      id: "user-id",
      email: "user@test.com",
      password: hashedPassword,
      status: "APPROVED",
      role: "Employee",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when the account is still PENDING", async () => {
    db.findUnique.mockResolvedValue({
      id: "user-id",
      email: "user@test.com",
      password: hashedPassword,
      status: "PENDING",
      role: "Employee",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "user@test.com",
      password: "password123",
    });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/pending/i);
  });

  it("returns 400 when email is missing from body", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
  });
});
