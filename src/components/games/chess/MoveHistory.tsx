import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Move {
  number: number;
  white: string;
  black?: string;
  fen?: string;
}

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
  onExportPGN?: () => void;
}

export function MoveHistory({
  moves,
  currentMoveIndex,
  onMoveClick,
  onExportPGN,
}: MoveHistoryProps) {
  const canGoBack = currentMoveIndex > 0;
  const canGoForward = currentMoveIndex < moves.length * 2 - 1;

  const handlePrevious = () => {
    if (canGoBack) {
      onMoveClick(currentMoveIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      onMoveClick(currentMoveIndex + 1);
    }
  };

  return (
    <Card className="bg-slate-950 border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Move History</h3>
        {onExportPGN && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPGN}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            PGN
          </Button>
        )}
      </div>

      <ScrollArea className="h-[300px] pr-4">
        {moves.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No moves yet
          </p>
        ) : (
          <div className="space-y-1">
            {moves.map((move, index) => (
              <div
                key={index}
                className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center"
              >
                {/* Move number */}
                <span className="text-xs font-bold text-slate-500">
                  {move.number}.
                </span>

                {/* White's move */}
                <button
                  onClick={() => onMoveClick(index * 2)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-mono transition-all text-left',
                    currentMoveIndex === index * 2
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  )}
                >
                  {move.white}
                </button>

                {/* Black's move */}
                {move.black ? (
                  <button
                    onClick={() => onMoveClick(index * 2 + 1)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-mono transition-all text-left',
                      currentMoveIndex === index * 2 + 1
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    {move.black}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Navigation controls */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoBack}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <span className="text-xs text-slate-500">
          Move {currentMoveIndex + 1} / {moves.length * 2}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoForward}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
