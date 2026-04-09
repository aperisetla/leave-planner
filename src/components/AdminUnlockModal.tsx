"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, X, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface AdminUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (password: string) => void;
}

export function AdminUnlockModal({ isOpen, onClose, onUnlock }: AdminUnlockModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setError("Please enter the admin password."); return; }
    setIsChecking(true);
    setError("");
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Incorrect password.");
        setPassword("");
        inputRef.current?.focus();
      } else {
        onUnlock(password);
      }
    } catch {
      setError("Could not verify password. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Lock size={16} className="text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Admin Access</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">
            Enter the admin password to enable editing, adding, and deleting leave entries.
          </p>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Password
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              className={clsx(
                "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition",
                error ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
              )}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
            {error && (
              <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle size={11} /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChecking}
              className={clsx(
                "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors",
                isChecking ? "bg-amber-400 text-white cursor-not-allowed" : "bg-amber-500 text-white hover:bg-amber-600"
              )}
            >
              {isChecking && <Loader2 size={14} className="animate-spin" />}
              {isChecking ? "Verifying…" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
