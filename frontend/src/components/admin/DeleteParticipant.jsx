import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../ui/alert-dialog';
import { adminApi, padTicket } from '../../lib/early';
import { errMsg } from '../../lib/api';

const DeleteParticipant = ({ row, onDeleted }) => {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.delete(`/admin/participants/${row.id}`);
      toast.success(`@${row.x_username} deleted`);
      onDeleted(row.id);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="p-1 text-[var(--ink-soft)] hover:text-red-700" title="Delete participant" data-testid={`participant-delete-${row.ticket_no}`}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none border-2 border-[var(--ink)] bg-[var(--paper)]" data-testid="participant-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-pixel text-[13px] leading-relaxed">Delete {padTicket(row.ticket_no)} · @{row.x_username}?</AlertDialogTitle>
          <AlertDialogDescription className="font-mono text-[12px]">
            Wallet {row.wallet} and {row.points} points will be removed permanently. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-mono rounded-none border-2 border-[var(--ink)]" data-testid="participant-delete-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={remove} className="font-mono rounded-none bg-red-700 text-white hover:bg-red-800" data-testid="participant-delete-confirm">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteParticipant;
