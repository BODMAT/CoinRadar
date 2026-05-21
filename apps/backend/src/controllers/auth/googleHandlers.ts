import type { Request, Response } from "express";
import crypto from "node:crypto";
import prisma from "../../prisma.js";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL,
  userInclude,
  type UserWithWallets,
} from "./authConfig.js";
import {
  parseCookieHeader,
  setOAuthStateCookie,
  clearOAuthStateCookie,
  createSession,
} from "./authHelpers.js";

const normalizeLogin = (raw: string): string =>
  raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "user";

const generateUniqueLogin = async (seed: string): Promise<string> => {
  const base = normalizeLogin(seed).slice(0, 24);
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await prisma.user.findFirst({
      where: { login: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}_${suffix}`.slice(0, 30);
  }
};

const getGoogleProfileFromCode = async (code: string) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth env vars are missing.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok)
    throw new Error("Failed to exchange Google auth code.");

  const tokenData = (await tokenResponse.json()) as { id_token?: string };
  if (!tokenData.id_token) throw new Error("Google did not return id_token.");

  const infoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`,
  );
  if (!infoResponse.ok) throw new Error("Failed to verify Google id_token.");

  const info = (await infoResponse.json()) as {
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: string;
    name?: string;
    picture?: string;
  };

  if (info.aud !== GOOGLE_CLIENT_ID)
    throw new Error("Google token audience mismatch.");
  if (!info.sub || !info.email)
    throw new Error("Google profile is incomplete.");

  return {
    sub: info.sub,
    email: info.email,
    emailVerified: info.email_verified === "true",
    name: info.name || info.email,
    picture: info.picture || null,
  };
};

export const startGoogleAuth = async (_req: Request, res: Response) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: "Google OAuth is not configured." });
    }

    const state = crypto.randomBytes(32).toString("hex");
    setOAuthStateCookie(res, state);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  } catch (error) {
    console.error("Google OAuth start error:", error);
    return res.status(500).json({ error: "Unable to start Google OAuth." });
  }
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const incomingState = req.query.state as string | undefined;
    const cookies = parseCookieHeader(req.headers.cookie);
    const storedState = cookies["oauth_state"];
    clearOAuthStateCookie(res);

    if (
      !code ||
      !incomingState ||
      !storedState ||
      incomingState !== storedState
    ) {
      return res.redirect(`${FRONTEND_URL}?auth=google_error`);
    }

    const profile = await getGoogleProfileFromCode(code);

    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_providerId: { provider: "google", providerId: profile.sub },
      },
      include: { user: { include: userInclude } },
    });

    let user: UserWithWallets | null = existingIdentity?.user ?? null;

    if (!user) {
      // Require Google-verified email to link or create.
      if (!profile.emailVerified) {
        return res.redirect(`${FRONTEND_URL}?auth=google_error`);
      }

      const existingByEmail = await prisma.user.findFirst({
        where: { email: profile.email },
        include: userInclude,
      });

      if (existingByEmail && existingByEmail.emailVerified) {
        // Verified email owner exists; attach Google identity.
        await prisma.authIdentity.upsert({
          where: {
            userId_provider: { userId: existingByEmail.id, provider: "google" },
          },
          create: {
            userId: existingByEmail.id,
            provider: "google",
            providerId: profile.sub,
          },
          update: { providerId: profile.sub },
        });
        user = existingByEmail;
      } else {
        // No verified owner: clear unverified squats, create a fresh Google account.
        await prisma.user.deleteMany({
          where: { emailVerified: false, email: profile.email },
        });

        const seed = profile.email.split("@")[0] || profile.name;
        const login = await generateUniqueLogin(seed);

        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              login,
              email: profile.email,
              password: null,
              emailVerified: true,
              photoUrl: profile.picture,
            },
            include: userInclude,
          });

          await tx.authIdentity.create({
            data: {
              userId: created.id,
              provider: "google",
              providerId: profile.sub,
            },
          });

          return created;
        });
      }
    }

    await createSession(user, req, res);
    return res.redirect(`${FRONTEND_URL}?auth=google_success`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return res.redirect(`${FRONTEND_URL}?auth=google_error`);
  }
};
