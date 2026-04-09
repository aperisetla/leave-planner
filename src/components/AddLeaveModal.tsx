"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useMembers } from "@/hooks/useLeaves";
import { LEAVE_TYPE_CONFIG } from "@/types";
import type { LeaveType, LeaveStatus, LeaveEntry } from "@/types";

// Convert a stored ISO datetime → YYYY-MM-DD in local time (handles IST offset correctly)
function toDateInput(iso: string): string {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

interface AddLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editEntry?: LeaveEntry;   // when set, modal is in "edit" mode
  adminPassword: string;    // required — sent as X-Admin-Password header
}

interface FormState {
  memberId: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  notes: string;
}

interface FormErrors {
  memberId?: string;
  startDate?: string;
  endDate?: string;
}

const EMPTY_FORM: FormState = {
  memberId: "",
  startDate: "",
  endDate: "",
  leaveType: "PTO",
  status: "APPROVED",
  notes: "",
};

const STATUS_OPTIONS: { value: LeaveStatus; label: string }[] = [
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING",  label: "Pending"  },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED",label: "Cancelled"},
];

export function AddLeaveModal({ isOpen, onClose, onSuccess, editEntry, adminPassword }: AddLeaveModalProps) {
  const isEditing = !!editEntry;
  const { members, isLoading: membersLoading } = useMembers();
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors]     = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // Populate form when modal opens — pre-fill if editing
  useEffect(() => {
    if (isOpen) {
      setForm(isEditing && editEntry ? {
        memberId:  editEntry.memberId,
        startDate: toDateInput(editEntry.startDate),
        endDate:   toDateInput(editEntry.endDate),
        leaveType: editEntry.leaveType,
        status:    editEntry.status,
        notes:     editEntry.notes ?? "",
      } : EMPTY_FORM);
      setErrors({});
      setSubmitStatus("idle");
      setSubmitMessage("");
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [isOpen, editEntry, isEditing]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.memberId)  errs.memberId  = "Please select a team member.";
    if (!form.startDate) errs.startDate = "Start date is required.";
    if (!form.endDate)   errs.endDate   = "End date is required.";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = "End date cannot be before start date.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const url    = isEditing ? `/api/leaves/${editEntry!.id}` : "/api/leaves";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Password": adminPassword },
        body: JSON.stringify({
          memberId:  form.memberId,
          startDate: form.startDate,
          endDate:   form.endDate,
          leaveType: form.leaveType,
          status:    form.status,
          notes:     form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // data.error can be a string OR a Zod flatten object { formErrors, fieldErrors }
        let errorMsg = "Failed to save leave entry.";
        if (typeof data?.error === "string") {
          errorMsg = data.error;
        } else if (data?.error?.formErrors?.[0]) {
          errorMsg = data.error.formErrors[0];
        } else if (data?.error?.fieldErrors) {
          const first = Object.entries(data.error.fieldErrors as Record<string, string[]>)
            .map(([f, msgs]) => `${f}: ${msgs.join(", ")}`)
            .join("; ");
          if (first) errorMsg = first;
        }
        throw new Error(errorMsg);
      }

      const memberName = members.find(m => m.id === form.memberId)?.name ?? "Team member";
      setSubmitStatus("success");
      setSubmitMessage(isEditing ? `✓ Updated leave for ${memberName}.` : `✓ Leave entry saved for ${memberName}.`);
      onSuccess();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setSubmitStatus("error");
      setSubmitMessage(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Plus size={16} className="text-blue-600" />
            </div>
            <h2 id="modal-title" className="text-base font-semibold text-gray-900">
              {isEditing ? "Edit Leave Entry" : "Log Leave Entry"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Team Member */}
            <Field label="Team Member" error={errors.memberId} required>
              <select
                ref={firstFieldRef}
                value={form.memberId}
                onChange={e => set("memberId", e.target.value)}
                disabled={membersLoading}
                className={fieldCls(!!errors.memberId)}
              >
                <option value="">— Select a team member —</option>
                {sortedMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>

            {/* Date row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date" error={errors.startDate} required>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => set("startDate", e.target.value)}
                  className={fieldCls(!!errors.startDate)}
                />
              </Field>
              <Field label="End Date" error={errors.endDate} required>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={e => set("endDate", e.target.value)}
                  className={fieldCls(!!errors.endDate)}
                />
              </Field>
            </div>

            {/* Leave Type */}
            <Field label="Leave Type">
              <select
                value={form.leaveType}
                onChange={e => set("leaveType", e.target.value as LeaveType)}
                className={fieldCls(false)}
              >
                {(Object.entries(LEAVE_TYPE_CONFIG) as [LeaveType, typeof LEAVE_TYPE_CONFIG[LeaveType]][]).map(
                  ([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>
                )}
              </select>
            </Field>

            {/* Status */}
            <Field label="Status">
              <select
                value={form.status}
                onChange={e => set("status", e.target.value as LeaveStatus)}
                className={fieldCls(false)}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            {/* Notes */}
            <Field label="Notes / Reason">
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                rows={2}
                placeholder="e.g. Medical appointment, family event…"
                className={clsx(fieldCls(false), "resize-none")}
              />
            </Field>

            {/* Submit feedback */}
            {submitStatus !== "idle" && (
              <div className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                submitStatus === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              )}>
                {submitStatus === "success"
                  ? <CheckCircle2 size={16} />
                  : <AlertCircle size={16} />}
                {submitMessage}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSubmitting}
              className={clsx(
                "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors",
                isSubmitting
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
              )}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Saving…" : isEditing ? "Update Entry" : "Save Leave Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fieldCls(hasError: boolean) {
  return clsx(
    "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 bg-white",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition",
    hasError ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"
  );
}

function Field({
  label, error, hint, required, children,
}: {
  label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1.5 text-gray-400 normal-case font-normal tracking-normal">({hint})</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}
