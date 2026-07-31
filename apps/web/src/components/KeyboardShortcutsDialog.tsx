import { memo } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BUILD_KEYS, DISCARD_KEYS, HAND_KEYS, STOCK_KEY } from '@/game/keyboardActions';

interface KeyboardShortcutsDialogProps {
  keyLabels: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const Keys = ({ codes, labels }: { codes: readonly string[]; labels: Record<string, string> }) => (
  <span className="flex flex-wrap gap-1">
    {codes.map((code) => (
      <kbd key={code} className="shortcut-key">
        {labels[code] ?? ''}
      </kbd>
    ))}
  </span>
);

const Row = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <span className="text-sm">{label}</span>
    {children}
  </div>
);

/**
 * The full key map. Reached with `?`, which works on the opponent's turn too —
 * that is when a player has the attention to go looking for it.
 *
 * Labels come from the context rather than being hardcoded, so on a non-QWERTY
 * layout the sheet lists the letters actually printed on the keys.
 */
function KeyboardShortcutsDialogComponent({ keyLabels, onOpenChange, open }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="keyboard-shortcuts-dialog">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>
            Les touches suivent la disposition du plateau&nbsp;: la rangée de chiffres pour les piles de construction,
            au-dessus de la rangée de lettres pour votre zone.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60">
          <Row label="Piles de construction">
            <Keys codes={BUILD_KEYS} labels={keyLabels} />
          </Row>
          <Row label="Talon">
            <Keys codes={[STOCK_KEY]} labels={keyLabels} />
          </Row>
          <Row label="Main">
            <Keys codes={HAND_KEYS} labels={keyLabels} />
          </Row>
          <Row label="Défausses">
            <Keys codes={DISCARD_KEYS} labels={keyLabels} />
          </Row>
          <Row label="Confirmer une défausse">
            <span className="flex gap-1">
              <kbd className="shortcut-key">Espace</kbd>
              <kbd className="shortcut-key">Entrée</kbd>
            </span>
          </Row>
          <Row label="Annuler">
            <kbd className="shortcut-key">Échap</kbd>
          </Row>
          <Row label="Afficher les touches">
            <kbd className="shortcut-key">Alt</kbd>
          </Row>
        </div>

        <p className="text-muted-sm">
          Choisissez une carte, puis sa destination. Un dépôt sur une pile de construction part aussitôt&nbsp;; une
          défausse, qui termine le tour, attend une confirmation.
        </p>
      </DialogContent>
    </Dialog>
  );
}

// The provider renders this on every one of its own renders, and all three props
// are stable references — memo keeps the closed sheet from re-allocating its
// element tree each time.
export const KeyboardShortcutsDialog = memo(KeyboardShortcutsDialogComponent);
