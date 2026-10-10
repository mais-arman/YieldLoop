import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormAlert } from '@/components/brand';
import { FieldError } from '@/components/job-ui';
import { Kg, ReuseBlockedNotice } from '@/components/inventory-ui';
import { useToast } from '@/hooks/use-toast';
import { AuthError } from '@/lib/auth';
import { INVENTORY_KEY, registerOffcut } from '@/lib/inventory';
import { MATERIAL_STATE_KEY, type MaterialEntry } from '@/lib/materials';
import { useI18n } from '@/lib/i18n';
import { invErrorMessage, newRequestId } from './mat-utils';

export function RegisterOffcutDialog({ entry, jobId, onClose }: { entry: MaterialEntry; jobId: number; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const reqId = useRef(newRequestId());
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const m = useMutation({
    mutationFn: () => registerOffcut({ job_id: jobId, source_entry_id: entry.id, request_id: reqId.current, reason: reason.trim() }),
    onSuccess: (lot) => {
      qc.invalidateQueries({ queryKey: INVENTORY_KEY });
      qc.invalidateQueries({ queryKey: [...MATERIAL_STATE_KEY, jobId] });
      toast({ title: t('invRegistered') });
      onClose();
      navigate(`/inventory/${lot.id}`);
    },
    onError: (err) => {
      // Definitive rejection: next attempt is a new request. Network uncertainty keeps the same id.
      if (err instanceof AuthError) reqId.current = newRequestId();
      if (err instanceof AuthError && err.code === 'already_registered') qc.invalidateQueries({ queryKey: INVENTORY_KEY });
    },
  });
  const already = m.error instanceof AuthError && m.error.code === 'already_registered';
  const reasonErr = touched && !reason.trim() ? t('invReasonRequired') : reason.length > 1000 ? t('noteTooLong') : undefined;
  const blocked = m.isPending || already || !confirm || !reason.trim() || reason.length > 1000;

  return (
    <AlertDialog open onOpenChange={(o) => { if (!o && !m.isPending) onClose(); }}>
      <AlertDialogContent data-testid="dialog-register-offcut">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('invRegisterTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('invRegisterDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">{t('invRegisterQty')}</span>
          <Kg v={entry.quantity} className="font-semibold" />
        </div>
        <ReuseBlockedNotice compact />
        {already ? (
          <div className="rounded-md border bg-accent/60 p-3 text-sm" role="alert" data-testid="alert-already-registered">
            <p className="font-medium">{t('inv_err_already_registered')}</p>
            <Link href={`/inventory?job_id=${jobId}`} className="mt-1 inline-block text-primary hover:underline" data-testid="link-job-lots">{t('invViewJobLots')}</Link>
          </div>
        ) : m.error ? <FormAlert message={invErrorMessage(m.error, t)} testId="error-register-offcut" /> : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-reason">{t('invReason')}</Label>
          <Textarea id="reg-reason" rows={3} value={reason} disabled={m.isPending} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={!!reasonErr} data-testid="input-register-reason" />
          <FieldError msg={reasonErr} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} disabled={m.isPending} className="mt-0.5" data-testid="checkbox-register-confirm" />
          {t('invRegisterConfirm')}
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={m.isPending} data-testid="button-cancel-register">{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={blocked} onClick={(e) => { e.preventDefault(); setTouched(true); if (!blocked) m.mutate(); }} data-testid="button-confirm-register">
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{m.isPending ? t('invRegistering') : t('invRegister')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
