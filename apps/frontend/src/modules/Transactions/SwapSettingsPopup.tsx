import { useAppSelector } from "../../store";
import {
  useGetSwapSettingsQuery,
  useUpdateSwapSettingsMutation,
} from "./swap.api";

export function SwapSettingsPopup() {
  const selectedWalletId = useAppSelector(
    (state) => state.selectedWallet.selectedWalletId,
  );

  const { data: settings, isFetching } = useGetSwapSettingsQuery(
    selectedWalletId || "",
    { skip: !selectedWalletId },
  );

  const [updateSwapSettings, { isLoading }] = useUpdateSwapSettingsMutation();

  if (!selectedWalletId) return null;

  const swapEnabled = settings?.swapEnabled ?? false;
  const stableCoins = settings?.stableCoins ?? ["usdt", "usdc"];
  const activeStableCoin = stableCoins[0] || "usdt";

  const handleToggle = async () => {
    await updateSwapSettings({
      walletId: selectedWalletId,
      data: { swapEnabled: !swapEnabled },
    });
  };

  const handleSelectStableCoin = async (selectedCoin: string) => {
    const reordered = [
      selectedCoin,
      ...stableCoins.filter((coin) => coin !== selectedCoin),
    ];

    await updateSwapSettings({
      walletId: selectedWalletId,
      data: { stableCoins: reordered },
    });
  };

  return (
    <div className="flex flex-col gap-5 p-2">
      <div className="flex items-center justify-between gap-4 p-3 border-2 border-gray-300 rounded">
        <label className="text-sm font-bold">Enable Swap</label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={swapEnabled}
            disabled={isLoading || isFetching}
            onChange={handleToggle}
          />
          <div className="w-12 h-7 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-5"></div>
        </label>
      </div>

      <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded">
        <label className="text-sm font-bold">Stable coin for swap</label>
        <div className="flex gap-3 flex-wrap">
          {stableCoins.map((coin) => {
            const isActive = coin === activeStableCoin;
            return (
              <label
                key={coin}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="stableCoin"
                  value={coin}
                  checked={isActive}
                  disabled={isLoading || isFetching}
                  onChange={() => handleSelectStableCoin(coin)}
                />
                {coin.toUpperCase()}
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-3 border border-gray-300 rounded text-sm">
        Swap creates an atomic operation: sell selected stable coin and buy
        target coin in one action.
      </div>
    </div>
  );
}
