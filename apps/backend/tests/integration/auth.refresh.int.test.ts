import request from "supertest";
import { getApp, resetDatabase } from "../helpers/testUtils.js";

describe("Auth refresh rotation", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("rotates refresh token and rejects old one", async () => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const registerResponse = await request(getApp())
      .post("/api/auth/register")
      .send({
        login: `auth_${unique}`,
        password: "password123",
        email: `auth_${unique}@mail.com`,
      });

    expect(registerResponse.status).toBe(201);

    const initialCookiesRaw = registerResponse.headers["set-cookie"];
    const initialCookies = Array.isArray(initialCookiesRaw)
      ? initialCookiesRaw
      : initialCookiesRaw
        ? [initialCookiesRaw]
        : [];
    expect(initialCookies.length).toBeGreaterThan(0);
    expect(initialCookies.join(";")).toContain("refresh_token=");

    const refreshResponse = await request(getApp())
      .post("/api/auth/refresh")
      .set("Cookie", initialCookies);

    expect(refreshResponse.status).toBe(200);
    const rotatedCookiesRaw = refreshResponse.headers["set-cookie"];
    const rotatedCookies = Array.isArray(rotatedCookiesRaw)
      ? rotatedCookiesRaw
      : rotatedCookiesRaw
        ? [rotatedCookiesRaw]
        : [];
    expect(rotatedCookies.length).toBeGreaterThan(0);
    expect(rotatedCookies.join(";")).toContain("refresh_token=");

    const replayOldTokenResponse = await request(getApp())
      .post("/api/auth/refresh")
      .set("Cookie", initialCookies);

    expect(replayOldTokenResponse.status).toBe(401);
  });

  it("returns current user via cookie-authenticated /auth/me", async () => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const login = `me_${unique}`;

    const registerResponse = await request(getApp())
      .post("/api/auth/register")
      .send({
        login,
        password: "password123",
        email: `me_${unique}@mail.com`,
      });

    expect(registerResponse.status).toBe(201);

    const cookiesRaw = registerResponse.headers["set-cookie"];
    const cookies = Array.isArray(cookiesRaw)
      ? cookiesRaw
      : cookiesRaw
        ? [cookiesRaw]
        : [];

    const meResponse = await request(getApp())
      .get("/api/auth/me")
      .set("Cookie", cookies);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body?.user?.login).toBe(login);
  });
});
