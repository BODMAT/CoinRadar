import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import prisma from "../../src/prisma.js";
import { getApp, resetDatabase } from "../helpers/testUtils.js";
import { __getCapturedEmails } from "../../src/services/emailService.js";

type MockGoogleProfile = {
  sub: string;
  email: string;
  email_verified?: string;
  name?: string;
  picture?: string;
};

const rand = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const loginOf = (prefix: string) => rand(prefix).slice(0, 30);

const mockGoogleFetch = (profile: MockGoogleProfile) => {
  type FetchLike = typeof globalThis.fetch;
  const fetchMock = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (...args: Parameters<FetchLike>) => {
      const [input] = args;
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/tokeninfo")) {
        return {
          ok: true,
          json: async () => ({
            aud: process.env.GOOGLE_CLIENT_ID,
            sub: profile.sub,
            email: profile.email,
            email_verified: profile.email_verified || "true",
            name: profile.name || "Test User",
            picture: profile.picture || null,
          }),
        } as Response;
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return {
          ok: true,
          json: async () => ({ id_token: "id-token-test" }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

  return () => fetchMock.mockRestore();
};

const startGoogleAndGetState = async (
  agent: ReturnType<typeof request.agent>,
) => {
  const startResponse = await agent.get("/api/auth/google/start");
  expect(startResponse.status).toBe(302);
  const location = String(startResponse.headers.location || "");
  const state = new URL(location).searchParams.get("state");
  expect(state).toBeTruthy();
  return state as string;
};

const registerUser = async (login: string, password: string, email: string) =>
  request(getApp()).post("/api/auth/register").send({ login, password, email });

const verifyUserDirectly = async (login: string) => {
  await prisma.user.update({
    where: { login },
    data: { emailVerified: true },
  });
};

const loginUser = async (login: string, password: string) =>
  request(getApp()).post("/api/auth/login").send({ login, password });

const cookiesFrom = (response: request.Response): string[] => {
  const raw = response.headers["set-cookie"];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
};

const accessCookieFromArray = (cookies: string[]): string | null => {
  for (const c of cookies) {
    if (c.startsWith("access_token=")) {
      return c.split(";")[0].slice("access_token=".length);
    }
  }
  return null;
};

describe("Auth security flows", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("prevents takeover: second register replaces unverified squat on same login/email", async () => {
    const login = loginOf("squat");
    const email = `${login}@mail.com`;

    const first = await registerUser(login, "password123", email);
    expect(first.status).toBe(201);
    const firstUser = await prisma.user.findUnique({ where: { login } });
    expect(firstUser).toBeTruthy();

    const second = await registerUser(login, "password456", email);
    expect(second.status).toBe(201);

    const users = await prisma.user.findMany({ where: { login } });
    expect(users).toHaveLength(1);
    expect(users[0]?.id).not.toBe(firstUser?.id);
  });

  it("blocks duplicate register against a verified account", async () => {
    const login = loginOf("verifiedconflict");
    const email = `${login}@mail.com`;

    expect((await registerUser(login, "password123", email)).status).toBe(201);
    await verifyUserDirectly(login);

    const second = await registerUser(login, "password456", email);
    expect(second.status).toBe(409);
  });

  it("email verification link supports success, consumed, and expired cases", async () => {
    const login = loginOf("verify");
    const email = `${login}@mail.com`;

    expect((await registerUser(login, "password123", email)).status).toBe(201);

    const verifyMail = __getCapturedEmails()
      .filter((m) => m.purpose === "verify_email" && m.to === email)
      .at(-1);
    expect(verifyMail?.token).toBeTruthy();

    const success = await request(getApp())
      .get("/api/auth/verify-email")
      .query({ token: verifyMail?.token });
    expect(success.status).toBe(302);
    expect(String(success.headers.location)).toContain("auth=verified");

    const consumed = await request(getApp())
      .get("/api/auth/verify-email")
      .query({ token: verifyMail?.token });
    expect(consumed.status).toBe(302);
    expect(String(consumed.headers.location)).toContain(
      "auth=already_verified",
    );

    const secondLogin = loginOf("verifyexp");
    const secondEmail = `${secondLogin}@mail.com`;
    expect(
      (await registerUser(secondLogin, "password123", secondEmail)).status,
    ).toBe(201);
    const secondMail = __getCapturedEmails()
      .filter((m) => m.purpose === "verify_email" && m.to === secondEmail)
      .at(-1);
    expect(secondMail?.token).toBeTruthy();

    await prisma.emailToken.updateMany({
      where: { purpose: "verify_email", consumedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expired = await request(getApp())
      .get("/api/auth/verify-email")
      .query({ token: secondMail?.token });
    expect(expired.status).toBe(302);
    expect(String(expired.headers.location)).toContain("auth=verify_error");
  });

  it("login is blocked until the email is verified", async () => {
    const login = loginOf("loginblock");
    const email = `${login}@mail.com`;
    const password = "password123";

    expect((await registerUser(login, password, email)).status).toBe(201);

    const before = await loginUser(login, password);
    expect(before.status).toBe(403);
    expect(before.body?.requiresVerification).toBe(true);

    await verifyUserDirectly(login);

    const after = await loginUser(login, password);
    expect(after.status).toBe(200);
  });

  it("auto-links google to a verified existing account on first sign-in", async () => {
    const login = loginOf("autolink");
    const email = `${login}@mail.com`;
    const password = "password123";

    expect((await registerUser(login, password, email)).status).toBe(201);
    await verifyUserDirectly(login);

    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubauto"),
      email,
      email_verified: "true",
    });
    try {
      const agent = request.agent(getApp());
      const state = await startGoogleAndGetState(agent);
      const callback = await agent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });

      expect(callback.status).toBe(302);
      expect(String(callback.headers.location)).toContain(
        "auth=google_success",
      );

      const linked = await prisma.authIdentity.findFirst({
        where: { user: { login }, provider: "google" },
      });
      expect(linked).toBeTruthy();
    } finally {
      restoreFetch();
    }
  });

  it("google sign-in replaces an unverified squat sharing the email", async () => {
    const squatLogin = loginOf("squatg");
    const email = `${squatLogin}@mail.com`;

    expect((await registerUser(squatLogin, "password123", email)).status).toBe(
      201,
    );
    const squatUser = await prisma.user.findUnique({
      where: { login: squatLogin },
    });
    expect(squatUser?.emailVerified).toBe(false);

    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubreplace"),
      email,
      email_verified: "true",
    });
    try {
      const agent = request.agent(getApp());
      const state = await startGoogleAndGetState(agent);
      const callback = await agent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });

      expect(callback.status).toBe(302);
      expect(String(callback.headers.location)).toContain(
        "auth=google_success",
      );

      // Squat row deleted; check by id, not login.
      const stillSquatById = await prisma.user.findUnique({
        where: { id: squatUser?.id ?? "" },
      });
      expect(stillSquatById).toBeNull();

      const googleUser = await prisma.user.findFirst({ where: { email } });
      expect(googleUser).toBeTruthy();
      expect(googleUser?.id).not.toBe(squatUser?.id);
      expect(googleUser?.emailVerified).toBe(true);
      expect(googleUser?.password).toBeNull();
    } finally {
      restoreFetch();
    }
  });

  it("google sign-in refuses if google itself did not verify the email", async () => {
    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubnv"),
      email: `${loginOf("gnv")}@mail.com`,
      email_verified: "false",
    });
    try {
      const agent = request.agent(getApp());
      const state = await startGoogleAndGetState(agent);
      const callback = await agent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });

      expect(callback.status).toBe(302);
      expect(String(callback.headers.location)).toContain("auth=google_error");
    } finally {
      restoreFetch();
    }
  });

  it("set-password: first set creates local identity; change requires correct old password", async () => {
    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubpwd"),
      email: `${loginOf("guser")}@mail.com`,
      email_verified: "true",
    });

    try {
      const agent = request.agent(getApp());
      const state = await startGoogleAndGetState(agent);
      await agent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });

      const first = await agent
        .post("/api/auth/set-password")
        .send({ password: "new-password-123" });
      expect(first.status).toBe(200);

      const me = await agent.get("/api/auth/me");
      expect(me.body?.user?.hasPassword).toBe(true);

      const wrongOld = await agent
        .post("/api/auth/set-password")
        .send({ oldPassword: "wrong-one", password: "rotated-789" });
      expect(wrongOld.status).toBe(401);

      const correctOld = await agent
        .post("/api/auth/set-password")
        .send({ oldPassword: "new-password-123", password: "rotated-789" });
      expect(correctOld.status).toBe(200);

      const userLogin = (await agent.get("/api/auth/me")).body?.user?.login;
      const reLogin = await loginUser(userLogin, "rotated-789");
      expect(reLogin.status).toBe(200);
    } finally {
      restoreFetch();
    }
  });

  it("updateProfile: rename re-signs access JWT and 409s on a taken login", async () => {
    const loginA = loginOf("renameA");
    const loginB = loginOf("renameB");
    const password = "password123";

    expect(
      (await registerUser(loginA, password, `${loginA}@mail.com`)).status,
    ).toBe(201);
    await verifyUserDirectly(loginA);
    expect(
      (await registerUser(loginB, password, `${loginB}@mail.com`)).status,
    ).toBe(201);
    await verifyUserDirectly(loginB);

    const agent = request.agent(getApp());
    expect(
      (await agent.post("/api/auth/login").send({ login: loginA, password }))
        .status,
    ).toBe(200);

    const newName = loginOf("renamed");
    const ok = await agent.patch("/api/auth/me").send({ login: newName });
    expect(ok.status).toBe(200);
    expect(ok.body?.user?.login).toBe(newName);

    const tokenCookie = accessCookieFromArray(cookiesFrom(ok));
    expect(tokenCookie).toBeTruthy();
    const decoded = jwt.verify(
      tokenCookie as string,
      process.env.JWT_SECRET as string,
    ) as { userLogin?: string };
    expect(decoded.userLogin).toBe(newName);

    const conflict = await agent.patch("/api/auth/me").send({ login: loginB });
    expect(conflict.status).toBe(409);
  });

  it("updateProfile: rejects unsafe photoUrl and stores a base64 data URL", async () => {
    const login = loginOf("photo");
    const password = "password123";
    expect(
      (await registerUser(login, password, `${login}@mail.com`)).status,
    ).toBe(201);
    await verifyUserDirectly(login);

    const agent = request.agent(getApp());
    expect(
      (await agent.post("/api/auth/login").send({ login, password })).status,
    ).toBe(200);

    const unsafe = await agent
      .patch("/api/auth/me")
      .send({ photoUrl: "javascript:alert(1)" });
    expect(unsafe.status).toBe(400);

    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAEUlEQVR42mP8/5+hngEKGAEALAIB/X1KGQAAAABJRU5ErkJggg==";
    const ok = await agent.patch("/api/auth/me").send({ photoUrl: dataUrl });
    expect(ok.status).toBe(200);
    expect(ok.body?.user?.photoUrl).toBe(dataUrl);
  });

  it("deletes a local account when the correct password is provided", async () => {
    const login = loginOf("delete");
    const password = "password123";
    expect(
      (await registerUser(login, password, `${login}@mail.com`)).status,
    ).toBe(201);
    await verifyUserDirectly(login);

    const agent = request.agent(getApp());
    expect(
      (await agent.post("/api/auth/login").send({ login, password })).status,
    ).toBe(200);

    const wrong = await agent
      .delete("/api/auth/account")
      .send({ password: "nope" });
    expect(wrong.status).toBe(401);

    const ok = await agent.delete("/api/auth/account").send({ password });
    expect(ok.status).toBe(200);

    expect(await prisma.user.findUnique({ where: { login } })).toBeNull();
  });

  it("deletes a google-only account immediately, no password required", async () => {
    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubdel"),
      email: `${loginOf("gdel")}@mail.com`,
      email_verified: "true",
    });
    try {
      const agent = request.agent(getApp());
      const state = await startGoogleAndGetState(agent);
      await agent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });

      const me = await agent.get("/api/auth/me");
      const googleLogin = me.body?.user?.login as string;
      expect(googleLogin).toBeTruthy();
      expect(me.body?.user?.hasPassword).toBe(false);

      const ok = await agent.delete("/api/auth/account").send({});
      expect(ok.status).toBe(200);

      expect(
        await prisma.user.findUnique({ where: { login: googleLogin } }),
      ).toBeNull();
    } finally {
      restoreFetch();
    }
  });

  it("revokes all refresh sessions on logout-all", async () => {
    const login = loginOf("logoutall");
    const password = "password123";
    expect(
      (await registerUser(login, password, `${login}@mail.com`)).status,
    ).toBe(201);
    await verifyUserDirectly(login);

    const loginResponse = await loginUser(login, password);
    expect(loginResponse.status).toBe(200);
    const cookies = cookiesFrom(loginResponse);
    expect(cookies.join(";")).toContain("refresh_token=");

    const logoutAll = await request(getApp())
      .post("/api/auth/logout-all")
      .set("Cookie", cookies);
    expect(logoutAll.status).toBe(200);

    const refreshAfter = await request(getApp())
      .post("/api/auth/refresh")
      .set("Cookie", cookies);
    expect(refreshAfter.status).toBe(401);
  });
});
