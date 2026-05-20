import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
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

const rand = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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
      return {
        ok: false,
        json: async () => ({}),
      } as Response;
    });

  return () => fetchMock.mockRestore();
};

const startGoogleAndGetState = async (agent: ReturnType<typeof request.agent>) => {
  const startResponse = await agent.get("/api/auth/google/start");
  expect(startResponse.status).toBe(302);
  const location = String(startResponse.headers.location || "");
  const state = new URL(location).searchParams.get("state");
  expect(state).toBeTruthy();
  return state as string;
};

const registerUser = async (login: string, password: string, email: string) => {
  return request(getApp()).post("/api/auth/register").send({
    login,
    password,
    email,
  });
};

const verifyUserDirectly = async (login: string) => {
  await prisma.user.update({
    where: { login },
    data: { emailVerified: true },
  });
};

const loginUser = async (login: string, password: string) => {
  return request(getApp()).post("/api/auth/login").send({ login, password });
};

describe("Auth security flows", () => {
  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID =
      process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET =
      process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:4000/api/auth/google/callback";
    process.env.API_PUBLIC_URL =
      process.env.API_PUBLIC_URL || "http://localhost:4000";

    await resetDatabase();
  });

  it("prevents takeover: second register can replace unverified squat on same login/email", async () => {
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

  it("requires merge-confirmation email when google sign-in hits an existing email account", async () => {
    const login = loginOf("merge");
    const email = `${login}@mail.com`;
    const password = "password123";

    const registerResponse = await registerUser(login, password, email);
    expect(registerResponse.status).toBe(201);
    await verifyUserDirectly(login);

    const restoreFetch = mockGoogleFetch({
      sub: rand("gsub"),
      email,
      email_verified: "true",
      name: login,
    });

    try {
      const agent = request.agent(getApp());
      const state = await startGoogleAndGetState(agent);
      const callback = await agent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });

      expect(callback.status).toBe(302);
      expect(String(callback.headers.location)).toContain(
        "auth=google_pending_merge",
      );

      const sent = __getCapturedEmails().filter(
        (m) => m.purpose === "merge_google" && m.to === email,
      );
      expect(sent.length).toBeGreaterThan(0);
      expect(sent.at(-1)?.token).toBeTruthy();
    } finally {
      restoreFetch();
    }
  });

  it("email verification link supports success, consumed, and expired cases", async () => {
    const login = loginOf("verify");
    const email = `${login}@mail.com`;

    const registerResponse = await registerUser(login, "password123", email);
    expect(registerResponse.status).toBe(201);

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
    const secondRegister = await registerUser(
      secondLogin,
      "password123",
      secondEmail,
    );
    expect(secondRegister.status).toBe(201);

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

  it("supports account linking both ways: merge-confirm and authenticated auto-link", async () => {
    const login = loginOf("link");
    const email = `${login}@mail.com`;
    const password = "password123";

    const registerResponse = await registerUser(login, password, email);
    expect(registerResponse.status).toBe(201);
    await verifyUserDirectly(login);

    const restoreFetchA = mockGoogleFetch({
      sub: rand("gsubpend"),
      email,
      email_verified: "true",
    });
    try {
      const pendingAgent = request.agent(getApp());
      const pendingState = await startGoogleAndGetState(pendingAgent);
      const pending = await pendingAgent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state: pendingState });
      expect(String(pending.headers.location)).toContain(
        "google_pending_merge",
      );

      const mergeToken = __getCapturedEmails()
        .filter((m) => m.purpose === "merge_google" && m.to === email)
        .at(-1)?.token;
      expect(mergeToken).toBeTruthy();

      const verifyMerge = await pendingAgent
        .get("/api/auth/verify-merge")
        .query({ token: mergeToken });
      expect(verifyMerge.status).toBe(302);
      expect(String(verifyMerge.headers.location)).toContain("merge_confirmed");
    } finally {
      restoreFetchA();
    }

    const localOnlyLogin = loginOf("linklocal");
    const localOnlyEmail = `${localOnlyLogin}@mail.com`;
    const reg2 = await registerUser(localOnlyLogin, password, localOnlyEmail);
    expect(reg2.status).toBe(201);
    await verifyUserDirectly(localOnlyLogin);

    const loginResponse = await loginUser(localOnlyLogin, password);
    expect(loginResponse.status).toBe(200);
    const cookieRaw = loginResponse.headers["set-cookie"];
    const loginCookies = Array.isArray(cookieRaw)
      ? cookieRaw
      : cookieRaw
        ? [cookieRaw]
        : [];

    const restoreFetchB = mockGoogleFetch({
      sub: rand("gsubauto"),
      email: localOnlyEmail,
      email_verified: "true",
    });
    try {
      const autoAgent = request.agent(getApp());
      const state = await startGoogleAndGetState(autoAgent);
      const callback = await autoAgent
        .get("/api/auth/google/callback")
        .set("Cookie", loginCookies.join("; "))
        .query({ code: "test-code", state });

      expect(callback.status).toBe(302);
      expect(String(callback.headers.location)).toContain(
        "auth=google_success",
      );

      const linked = await prisma.authIdentity.findFirst({
        where: { user: { login: localOnlyLogin }, provider: "google" },
      });
      expect(linked).toBeTruthy();
    } finally {
      restoreFetchB();
    }
  });

  it("supports set-password and one-time-password flows", async () => {
    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubpwd"),
      email: `${loginOf("guser")}@mail.com`,
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

      const setPasswordResponse = await agent
        .post("/api/auth/set-password")
        .send({ password: "new-password-123" });
      expect(setPasswordResponse.status).toBe(200);

      const me = await agent.get("/api/auth/me");
      expect(me.status).toBe(200);
      expect(me.body?.user?.hasPassword).toBe(true);

      const otpResponse = await agent.post("/api/auth/send-one-time-password");
      expect(otpResponse.status).toBe(200);

      const meAfterOtp = await agent.get("/api/auth/me");
      expect(meAfterOtp.status).toBe(200);
      const userLogin = meAfterOtp.body?.user?.login;
      const userEmail = meAfterOtp.body?.user?.email;
      expect(userLogin).toBeTruthy();
      expect(userEmail).toBeTruthy();

      const otpMail = __getCapturedEmails()
        .filter((m) => m.purpose === "one_time_password" && m.to === userEmail)
        .at(-1);
      expect(otpMail?.otp).toBeTruthy();

      const loginWithOtp = await request(getApp())
        .post("/api/auth/login")
        .send({ login: userLogin, password: otpMail?.otp });
      expect(loginWithOtp.status).toBe(200);
    } finally {
      restoreFetch();
    }
  });

  it("supports account deletion for local-password and google-only email-link cases", async () => {
    const localLogin = loginOf("deletelocal");
    const localEmail = `${localLogin}@mail.com`;
    const localPassword = "password123";

    const localRegister = await registerUser(
      localLogin,
      localPassword,
      localEmail,
    );
    expect(localRegister.status).toBe(201);
    await verifyUserDirectly(localLogin);

    const localAgent = request.agent(getApp());
    const localSignIn = await localAgent
      .post("/api/auth/login")
      .send({ login: localLogin, password: localPassword });
    expect(localSignIn.status).toBe(200);

    const localDelete = await localAgent
      .delete("/api/auth/account")
      .send({ password: localPassword });
    expect(localDelete.status).toBe(200);

    const localStillThere = await prisma.user.findUnique({
      where: { login: localLogin },
    });
    expect(localStillThere).toBeNull();

    const restoreFetch = mockGoogleFetch({
      sub: rand("gsubdel"),
      email: `${loginOf("gdel")}@mail.com`,
      email_verified: "true",
    });
    try {
      const googleAgent = request.agent(getApp());
      const state = await startGoogleAndGetState(googleAgent);
      const callback = await googleAgent
        .get("/api/auth/google/callback")
        .query({ code: "test-code", state });
      expect(callback.status).toBe(302);

      const requestDelete = await googleAgent.post(
        "/api/auth/account/request-delete",
      );
      expect(requestDelete.status).toBe(200);

      const me = await googleAgent.get("/api/auth/me");
      const googleLogin = me.body?.user?.login as string;
      expect(googleLogin).toBeTruthy();

      const deleteToken = __getCapturedEmails()
        .filter((m) => m.purpose === "delete_account")
        .at(-1)?.token;
      expect(deleteToken).toBeTruthy();

      const confirm = await request(getApp())
        .get("/api/auth/account/confirm-delete")
        .query({ token: deleteToken });
      expect(confirm.status).toBe(302);
      expect(String(confirm.headers.location)).toContain(
        "auth=account_deleted",
      );

      const googleStillThere = await prisma.user.findUnique({
        where: { login: googleLogin },
      });
      expect(googleStillThere).toBeNull();
    } finally {
      restoreFetch();
    }
  });

  it("revokes all refresh sessions on logout-all", async () => {
    const login = loginOf("logoutall");
    const email = `${login}@mail.com`;
    const password = "password123";

    const registerResponse = await registerUser(login, password, email);
    expect(registerResponse.status).toBe(201);
    await verifyUserDirectly(login);

    const loginResponse = await request(getApp())
      .post("/api/auth/login")
      .send({ login, password });
    expect(loginResponse.status).toBe(200);

    const cookieRaw = loginResponse.headers["set-cookie"];
    const cookies = Array.isArray(cookieRaw)
      ? cookieRaw
      : cookieRaw
        ? [cookieRaw]
        : [];
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
