'use client';
import { useState, useCallback } from 'react';

type DeleteTarget = {
  id: number | string;
  name?: string;
  [key: string]: any;
};

export function useDeleteConfirm<T extends DeleteTarget = DeleteTarget>(
  onDelete: (item: T) => Promise<void> | void
) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = useCallback((item: T) => {
    setTarget(item);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setTarget(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    try {
      await onDelete(target);
      close();
    } finally {
      setLoading(false);
    }
  }, [target, onDelete, close]);

  return { open, target, loading, ask, close, confirm };
}