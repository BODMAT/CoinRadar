import type { AppDispatch } from "../../store";
import { allCryptoApi } from "./all-crypto.api";
import { sincronizeAllCoins, setIsAPILoading } from "./all-crypto.slice";

export const fetchAllCoinsThunk = () => async (dispatch: AppDispatch) => {
    try {
        dispatch(setIsAPILoading(true));
        const result = await dispatch(
            allCryptoApi.endpoints.getAllCoins.initiate(undefined, {
                forceRefetch: true,
                subscriptionOptions: { pollingInterval: 60000, },
            })

        ).unwrap();
        dispatch(sincronizeAllCoins(result));
    } catch (e) {
        console.error("error fetching coins", e);
    } finally {
        dispatch(setIsAPILoading(false));
    }
};
