import {Button} from "@/components/ui/button.tsx";

interface DebugStripProps {
    debugFillBuildPile: (() => void);
    debugWin: (() => void);
}

export function DebugStrip(props: DebugStripProps) {
    return import.meta.env.DEV ? <div className="flex flex-row gap-1">
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
        {props.debugWin ? (
            <Button
                variant="destructive"
                size="xs"
                onClick={props.debugWin}
                data-testid="debug-win-button"
            >
                Win
            </Button>
        ) : null}
    </div> : null;
}