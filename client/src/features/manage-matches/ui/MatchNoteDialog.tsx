import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StickyNote } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFormFooter, Textarea } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { useUpdateMatchNote, type Match } from '@/entities/match';

const MAX_NOTE_LENGTH = 500;

/** Note textarea + save; closes on success, shows server errors as a toast. */
function MatchNoteForm({ match, onClose }: { match: Match; onClose: () => void }) {
  const { t } = useTranslation();
  const [note, setNote] = useState(match.note ?? '');
  const { mutate: saveNote, isPending } = useUpdateMatchNote();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveNote(
      { id: match.id, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(t('matches.noteSaved'));
          onClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <Textarea
        rows={5}
        maxLength={MAX_NOTE_LENGTH}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('matches.notePlaceholder')}
      />
      <p className="text-right text-[11px] text-slate">{note.length}/{MAX_NOTE_LENGTH}</p>
      <DialogFormFooter onClose={onClose} isPending={isPending} />
    </form>
  );
}

/** Small "Note" button that opens a dialog to edit the owner's note on an offer. */
export function MatchNoteButton({ match }: { match: Match }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title={match.note ?? t('matches.note')}
        className="h-7 gap-1 rounded-full px-2 text-[11px] font-normal text-slate"
      >
        <StickyNote className={match.note ? 'h-3.5 w-3.5 text-pricing-blue' : 'h-3.5 w-3.5'} />
        {t('matches.note')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('matches.noteTitle')}</DialogTitle>
          </DialogHeader>
          {open && <MatchNoteForm match={match} onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
