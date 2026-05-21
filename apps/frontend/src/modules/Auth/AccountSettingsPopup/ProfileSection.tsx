import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { useUpdateProfileMutation } from "../auth.api";
import type { UserSafe } from "../auth.schema";
import {
  extractServerError,
  inputClass,
  secondaryButtonClass,
} from "../auth.utils";

const MAX_PHOTO_BYTES = 600 * 1024;

const primaryButtonClass =
  "w-full py-3 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-all cursor-pointer hover:shadow-purple-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0";

export function ProfileSection({ user }: { user: UserSafe }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [login, setLogin] = useState(user.login);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    user.photoUrl ?? null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [updateProfile, { isLoading, error, isError }] =
    useUpdateProfileMutation();
  const serverError = isError ? extractServerError(error) : null;

  const dirty = login !== user.login || photoUrl !== (user.photoUrl ?? null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Please pick an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFileError("Image is too large. Max ~600 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    };
    reader.onerror = () => setFileError("Could not read the file.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    if (!dirty) return;

    const payload: { login?: string; photoUrl?: string | null } = {};
    if (login !== user.login) payload.login = login.trim();
    if (photoUrl !== (user.photoUrl ?? null)) {
      payload.photoUrl = photoUrl === null ? null : photoUrl.trim();
    }

    try {
      const response = await updateProfile(payload).unwrap();
      setSuccessMessage(response.message);
    } catch (error) {
      console.error("Update profile failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              onError={() => setFileError("Could not load that image.")}
            />
          ) : (
            <span className="text-3xl opacity-60">
              {user.login.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className={secondaryButtonClass}
          >
            Upload from device
          </button>
          <button
            type="button"
            onClick={() => setPhotoUrl(null)}
            disabled={isLoading || photoUrl === null}
            className={secondaryButtonClass}
          >
            Remove photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold opacity-70 mb-2">
          Photo URL
        </label>
        <input
          type="text"
          value={photoUrl && !photoUrl.startsWith("data:") ? photoUrl : ""}
          onChange={(e) => setPhotoUrl(e.target.value || null)}
          disabled={isLoading}
          className={inputClass}
          placeholder="https://example.com/avatar.png"
        />
        {photoUrl?.startsWith("data:") && (
          <p className="mt-1 text-xs opacity-60">
            Currently using an uploaded image. Type a URL above to switch.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold opacity-70 mb-2">
          Change login
        </label>
        <input
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          disabled={isLoading}
          className={inputClass}
          placeholder="Enter a new login (3-30 characters)"
          maxLength={30}
        />
        <p className="mt-1 text-xs opacity-60">
          If this login is already taken, you will see a notification after
          saving.
        </p>
      </div>

      {(fileError || serverError) && (
        <div className="p-3 text-sm text-red-200 bg-red-900/40 border border-red-500/30 rounded-xl">
          {fileError || serverError}
        </div>
      )}
      {successMessage && (
        <div className="p-3 text-sm text-green-100 bg-green-900/40 border border-green-500/30 rounded-xl">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !dirty}
        className={primaryButtonClass}
        style={{ background: "var(--color-fixed)" }}
      >
        {isLoading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
