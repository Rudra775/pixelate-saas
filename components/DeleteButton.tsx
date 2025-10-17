'use client';

import { useTransition } from 'react';

export default function DeleteButton({ id, publicId }: { id: string; publicId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Delete this asset permanently?')) return;
    startTransition(async () => {
      await fetch(`/api/frames/${id}`, { method: 'DELETE' });
      window.location.reload();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
