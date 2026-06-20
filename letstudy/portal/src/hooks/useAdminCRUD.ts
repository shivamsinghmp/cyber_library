"use client";

import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";

export type CRUDOptions<T> = {
  listUrl: string;
  createUrl?: string;
  updateUrl?: (item: T) => string;
  deleteUrl?: (item: T) => string;
  getId?: (item: T) => string;
  onCreateSuccess?: string;
  onUpdateSuccess?: string;
  onDeleteSuccess?: string;
  confirmDeleteMessage?: (item: T) => string;
};

export type CRUDState<T> = {
  items: T[];
  loading: boolean;
  saving: boolean;
  createOpen: boolean;
  editItem: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  closeModals: () => void;
  handleCreate: (formData: unknown) => Promise<boolean>;
  handleUpdate: (formData: unknown) => Promise<boolean>;
  handleDelete: (item: T) => Promise<void>;
  refetch: () => void;
};

export function useAdminCRUD<T extends { id?: string }>(
  opts: CRUDOptions<T>
): CRUDState<T> {
  const {
    listUrl,
    createUrl,
    updateUrl,
    deleteUrl,
    getId = (item) => item.id ?? "",
    onCreateSuccess = "Created successfully",
    onUpdateSuccess = "Updated successfully",
    onDeleteSuccess = "Deleted successfully",
    confirmDeleteMessage = () => "Delete this item?",
  } = opts;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(listUrl, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: T[]) => { if (!cancelled) setItems(d); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [listUrl, tick]);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const openEdit = useCallback((item: T) => setEditItem(item), []);
  const closeModals = useCallback(() => {
    setCreateOpen(false);
    setEditItem(null);
  }, []);

  const handleCreate = useCallback(async (formData: unknown): Promise<boolean> => {
    const url = createUrl ?? listUrl;
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to create");
        return false;
      }
      toast.success(onCreateSuccess);
      closeModals();
      refetch();
      return true;
    } catch {
      toast.error("Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  }, [createUrl, listUrl, onCreateSuccess, closeModals, refetch]);

  const handleUpdate = useCallback(async (formData: unknown): Promise<boolean> => {
    if (!editItem) return false;
    const url = updateUrl
      ? updateUrl(editItem)
      : `${listUrl}/${getId(editItem)}`;
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to update");
        return false;
      }
      toast.success(onUpdateSuccess);
      closeModals();
      refetch();
      return true;
    } catch {
      toast.error("Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  }, [editItem, updateUrl, listUrl, getId, onUpdateSuccess, closeModals, refetch]);

  const handleDelete = useCallback(async (item: T): Promise<void> => {
    if (!confirm(confirmDeleteMessage(item))) return;
    const url = deleteUrl
      ? deleteUrl(item)
      : `${listUrl}/${getId(item)}`;
    try {
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success(onDeleteSuccess);
      refetch();
    } catch {
      toast.error("Something went wrong");
    }
  }, [deleteUrl, listUrl, getId, onDeleteSuccess, refetch, confirmDeleteMessage]);

  return {
    items,
    loading,
    saving,
    createOpen,
    editItem,
    openCreate,
    openEdit,
    closeModals,
    handleCreate,
    handleUpdate,
    handleDelete,
    refetch,
  };
}
