import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { logout, setUserData } from "../modules/Auth/auth.slice";
import {
  clearWalletState,
  setWalletsList,
} from "../modules/Wallet/selectedWallet.slice";
import { UserSchema, type UserSafe } from "../modules/Auth/auth.schema";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://coinradar-wmzg.onrender.com/api/";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  credentials: "include",
});

const isAuthBypassRequest = (args: string | FetchArgs): boolean => {
  const url = typeof args === "string" ? args : args.url;
  return (
    url.includes("auth/refresh") ||
    url.includes("auth/login") ||
    url.includes("auth/register") ||
    url.includes("auth/google")
  );
};

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isAuthBypassRequest(args)) {
    const refreshResult = await rawBaseQuery(
      {
        url: "auth/refresh",
        method: "POST",
      },
      api,
      extraOptions,
    );

    if (
      refreshResult.data &&
      typeof refreshResult.data === "object" &&
      refreshResult.data !== null &&
      "user" in refreshResult.data
    ) {
      try {
        const parsedUser: UserSafe = UserSchema.parse(
          (refreshResult.data as { user: unknown }).user,
        );
        api.dispatch(setUserData(parsedUser));
        api.dispatch(setWalletsList(parsedUser.wallets || []));
        result = await rawBaseQuery(args, api, extraOptions);
      } catch {
        api.dispatch(logout());
        api.dispatch(clearWalletState());
      }
    } else {
      api.dispatch(logout());
      api.dispatch(clearWalletState());
    }
  }

  return result;
};
