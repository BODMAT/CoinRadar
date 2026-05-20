import request from "supertest";
import prisma from "../../src/prisma.js";
import { getApp, resetDatabase } from "../helpers/testUtils.js";

const registerVerifyLogin = async (slug: string) => {
  const login = `${slug}_${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = "password123";

  const registerResponse = await request(getApp())
    .post("/api/auth/register")
    .send({ login, password, email: `${login}@mail.com` });
  expect(registerResponse.status).toBe(201);
  expect(registerResponse.body.requiresVerification).toBe(true);

  await prisma.user.update({
    where: { login },
    data: { emailVerified: true },
  });

  const loginResponse = await request(getApp())
    .post("/api/auth/login")
    .send({ login, password });
  expect(loginResponse.status).toBe(200);

  const raw = loginResponse.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return { login, cookies };
};

describe("Auth refresh rotation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("rotates refresh token and rejects old one", async () => {
    const { cookies: initialCookies } = await registerVerifyLogin("auth");

    expect(initialCookies.length).toBeGreaterThan(0);
    expect(initialCookies.join(";")).toContain("refresh_token=");

    const refreshResponse = await request(getApp())
      .post("/api/auth/refresh")
      .set("Cookie", initialCookies);

    expect(refreshResponse.status).toBe(200);
    const rotatedRaw = refreshResponse.headers["set-cookie"];
    const rotatedCookies = Array.isArray(rotatedRaw)
      ? rotatedRaw
      : rotatedRaw
        ? [rotatedRaw]
        : [];
    expect(rotatedCookies.length).toBeGreaterThan(0);
    expect(rotatedCookies.join(";")).toContain("refresh_token=");

    const replayOldTokenResponse = await request(getApp())
      .post("/api/auth/refresh")
      .set("Cookie", initialCookies);

    expect(replayOldTokenResponse.status).toBe(401);
  });

  it("returns current user via cookie-authenticated /auth/me", async () => {
    const { login, cookies } = await registerVerifyLogin("me");

    const meResponse = await request(getApp())
      .get("/api/auth/me")
      .set("Cookie", cookies);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body?.user?.login).toBe(login);
  });
});
