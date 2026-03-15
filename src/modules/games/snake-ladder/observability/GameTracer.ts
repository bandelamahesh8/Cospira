// Assuming @opentelemetry/api is available
import { trace, Span } from '@opentelemetry/api';

export class GameTracer {
  private static tracer = trace.getTracer('snake-ladder-engine', '1.0.0');

  static startMoveResolve(roomId: string, playerId: string): Span {
    return this.tracer.startSpan('snake_ladder.move.resolve', {
      attributes: { roomId, playerId },
    });
  }

  static startValidateTurn(span: Span): Span {
    return this.tracer.startSpan('snake_ladder.validate_turn', { parent: span });
  }

  static startComputePosition(span: Span, diceValue: number): Span {
    const child = this.tracer.startSpan('snake_ladder.compute_position', { parent: span });
    child.setAttribute('diceValue', diceValue);
    return child;
  }

  static startCheckSnake(span: Span, position: number): Span {
    const child = this.tracer.startSpan('snake_ladder.check_snake', { parent: span });
    child.setAttribute('position', position);
    return child;
  }

  static startCheckLadder(span: Span, position: number): Span {
    const child = this.tracer.startSpan('snake_ladder.check_ladder', { parent: span });
    child.setAttribute('position', position);
    return child;
  }

  static startAdvanceTurn(span: Span): Span {
    return this.tracer.startSpan('snake_ladder.advance_turn', { parent: span });
  }

  static startEmitEvents(span: Span): Span {
    return this.tracer.startSpan('snake_ladder.emit_events', { parent: span });
  }
}
