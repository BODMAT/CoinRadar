import React from "react";

interface TransactionFormFieldsProps {
  form: {
    quantity: string;
    price: string;
    total_price: string;
    createdAt: string;
    buyOrSell: "buy" | "sell";
  };
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  maxDateTime: string;
  isLoading: boolean;
  submitLabel: string;
  loadingLabel: string;
  /** Optional slot rendered between the Type select and the Price/Qty grid (e.g. swap toggle). */
  swapSlot?: React.ReactNode;
}

export function TransactionFormFields({
  form,
  onChange,
  maxDateTime,
  isLoading,
  submitLabel,
  loadingLabel,
  swapSlot,
}: TransactionFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold">Type</label>
        <select
          required
          name="buyOrSell"
          value={form.buyOrSell}
          onChange={onChange}
          className={`p-2 border-2 rounded font-bold ${form.buyOrSell === "buy" ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}`}
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>

      {swapSlot}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">Price</label>
          <input
            required
            className="p-2 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
            type="text"
            name="price"
            value={form.price}
            onChange={onChange}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold">Quantity</label>
          <input
            required
            className="p-2 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
            type="text"
            name="quantity"
            value={form.quantity}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold">Total</label>
        <input
          required
          className="p-2 border-2 border-gray-200 rounded"
          type="text"
          name="total_price"
          value={form.total_price}
          onChange={onChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold">Date</label>
        <input
          required
          className="p-2 border-2 border-gray-300 rounded text-white [&::-webkit-calendar-picker-indicator]:invert
    [&::-webkit-calendar-picker-indicator]:cursor-pointer"
          type="datetime-local"
          name="createdAt"
          value={form.createdAt}
          onChange={onChange}
          max={maxDateTime}
        />
      </div>

      <button
        type="submit"
        disabled={!form.quantity || isLoading}
        className="mt-2 p-3 bg-black text-white rounded-lg font-bold hover:opacity-80 disabled:opacity-50 transition-all"
      >
        {isLoading ? loadingLabel : submitLabel}
      </button>
    </>
  );
}
