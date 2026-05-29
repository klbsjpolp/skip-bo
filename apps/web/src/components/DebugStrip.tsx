import { Button } from '@/components/ui/button.tsx';

interface DebugStripProps {
  debugFillBuildPile: () => void;
  debugFillHandSkipBo: () => void;
  debugClearStockPile: () => void;
  debugClearAiStockPile: () => void;
  debugWin: () => void;
}

export function DebugStrip(props: DebugStripProps) {
  return import.meta.env.DEV ? (
    <div className="flex flex-row gap-1">
      {props.debugFillBuildPile ? (
        <Button
          variant="destructive"
          size="xs"
          onClick={props.debugFillBuildPile}
          data-testid="debug-fill-build-pile-button"
        >
          Fill build pile
        </Button>
      ) : null}
      {props.debugFillHandSkipBo ? (
        <Button
          variant="destructive"
          size="xs"
          onClick={props.debugFillHandSkipBo}
          data-testid="debug-fill-hand-skipbo-button"
        >
          Fill hand Skip-Bo
        </Button>
      ) : null}
      {props.debugClearStockPile ? (
        <Button
          variant="destructive"
          size="xs"
          onClick={props.debugClearStockPile}
          data-testid="debug-clear-stock-pile-button"
        >
          Clear stock pile
        </Button>
      ) : null}
      {props.debugClearAiStockPile ? (
        <Button
          variant="destructive"
          size="xs"
          onClick={props.debugClearAiStockPile}
          data-testid="debug-clear-ai-stock-pile-button"
        >
          Clear AI stock pile
        </Button>
      ) : null}
      {props.debugWin ? (
        <Button variant="destructive" size="xs" onClick={props.debugWin} data-testid="debug-win-button">
          Win
        </Button>
      ) : null}
    </div>
  ) : null;
}
