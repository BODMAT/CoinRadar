import { useAppDispatch, useAppSelector } from "../../store";
import Select, { type SingleValue } from 'react-select';
import { selectWallet } from "./selectedWallet.slice";
import type { Theme } from "../FixedFooter/theme.slice";
import { styles } from "../../utils/sorting.options";

interface SelectOption {
    value: string;
    label: string;
}
export function WalletSelector() {
    const { walletsList, selectedWalletId } = useAppSelector(state => state.selectedWallet);
    const dispatch = useAppDispatch();
    const theme: Theme = useAppSelector((state) => state.theme.theme);


    const options: SelectOption[] = walletsList.map(wallet => ({
        value: wallet.id,
        label: wallet.name,
    }));

    const selectedOption: SelectOption | null = selectedWalletId
        ? options.find(option => option.value === selectedWalletId) || null
        : null;

    const handleChange = (newValue: SingleValue<SelectOption>) => {
        if (newValue) {
            dispatch(selectWallet(newValue.value));
        }
    };

    if (!walletsList || walletsList.length === 0) {
        return <p className="">Wallet list is empty. Please add a wallet.</p>;
    }

    return (
        <div className="p-4 flex items-center gap-4 min-w-[200px] max-[400px]:flex-col">
            <label className="block text-2xl font-medium">
                Choose a wallet:
            </label>
            <Select
                options={options}
                value={selectedOption}
                onChange={handleChange}
                isSearchable={false}
                placeholder="Select..."
                styles={styles(theme)}
            />
        </div>
    );
}