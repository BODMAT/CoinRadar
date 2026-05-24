import EditSVG from "../../assets/edit.svg";
import DeleteSVG from "../../assets/cross.svg";
import { formatPrice, formatQuantity } from "../../utils/functions";

export interface TransactionRowData {
  id: string;
  coinSymbol: string;
  buyOrSell: "buy" | "sell";
  swapGroupId?: string | null;
  quantity: number;
  price: number;
  createdAt: string | Date;
  image: string;
  name: string;
}

interface TransactionRowProps {
  transaction: TransactionRowData;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function TransactionRow({
  transaction,
  onEdit,
  onDelete,
  isDeleting,
}: TransactionRowProps) {
  return (
    <div
      className={`text-[15px] text-center max-md:text-[12px] grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 items-center content-center gap-1 max-md:gap-px p-4 m-1 border-b border-gray-300 rounded-xl ${transaction.buyOrSell === "buy" ? "bg-green-400/20" : "bg-red-400/20"} ${transaction.swapGroupId ? "ring-1 ring-sky-400/40" : ""}`}
    >
      <div className="flex gap-2 items-center mx-auto">
        <img
          src={transaction.image}
          alt={transaction.name}
          className="w-8 h-8 max-[385px]:hidden rounded-full"
        />
        <span className="uppercase font-bold">{transaction.coinSymbol}</span>
      </div>

      <div className="max-[460px]:hidden uppercase font-bold text-xs flex items-center justify-center gap-2">
        <span>{transaction.buyOrSell}</span>
        {transaction.swapGroupId && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
            SWAP
          </span>
        )}
      </div>

      <div>{formatQuantity(transaction.quantity)}</div>
      <div>{formatPrice(transaction.price)}</div>

      <div className="max-[560px]:hidden text-xs">
        {new Date(transaction.createdAt).toLocaleString()}
      </div>

      {transaction.swapGroupId ? (
        <div />
      ) : (
        <button
          onClick={onEdit}
          className="flex justify-center items-center hover:scale-110 transition-transform cursor-pointer"
        >
          <img className="w-6 h-6" src={EditSVG} alt="edit" />
        </button>
      )}

      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="flex justify-center w-7 h-7 mx-auto items-center hover:scale-110 transition-transform cursor-pointer rounded-full bg-black disabled:opacity-50"
      >
        <img className="w-4 h-4" src={DeleteSVG} alt="delete" />
      </button>
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="grid grid-cols-7 max-[560px]:grid-cols-6 max-[460px]:grid-cols-5 gap-1 p-4 m-1 border-b border-gray-200 rounded-xl animate-pulse">
      <div className="flex gap-2 items-center mx-auto">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="w-12 h-4 bg-gray-300 rounded"></div>
      </div>
      <div className="max-[460px]:hidden w-10 h-4 bg-gray-300 rounded mx-auto"></div>
      <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
      <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
      <div className="max-[560px]:hidden w-24 h-4 bg-gray-300 rounded mx-auto"></div>
      <div className="w-6 h-6 bg-gray-300 rounded mx-auto"></div>
      <div className="w-6 h-6 bg-gray-300 rounded-full mx-auto"></div>
    </div>
  );
}
