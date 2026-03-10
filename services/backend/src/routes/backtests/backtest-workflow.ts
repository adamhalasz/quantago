import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { AppError } from '../../lib/errors';
import { resolveBacktestExecutionConfig, runBacktest } from '../../lib/backtest-engine/runner';
import type { BackendEnv } from '../../worker-types';
import { completeBacktestRunById, findBacktestByIdForWorkflow, markBacktestFailedById, markBacktestRunningById } from './backtests-repository';

type BacktestWorkflowParams = {
  backtestId: string;
};

type BacktestWorkflowState = {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  strategy: string;
  start_date: string;
  end_date: string;
  initial_balance: number;
  status: string;
  parameters_json: string;
};

export class BacktestWorkflow extends WorkflowEntrypoint<BackendEnv, BacktestWorkflowParams> {
  async run(event: WorkflowEvent<BacktestWorkflowParams>, step: WorkflowStep) {
    const backtest = await step.do<BacktestWorkflowState>('load backtest request', async () => {
      const row = await findBacktestByIdForWorkflow(this.env, event.payload.backtestId);

      if (!row) {
        throw new AppError('Backtest not found', 404);
      }

      return {
        id: row.id,
        user_id: row.user_id,
        symbol: row.symbol,
        exchange: row.exchange,
        strategy: row.strategy,
        start_date: row.start_date,
        end_date: row.end_date,
        initial_balance: row.initial_balance,
        status: row.status,
        parameters_json: typeof row.parameters === 'string' ? row.parameters : JSON.stringify(row.parameters),
      };
    });

    const parameters = JSON.parse(backtest.parameters_json) as Record<string, unknown>;

    if (backtest.status === 'completed') {
      return { backtestId: backtest.id, status: 'completed' };
    }

    try {
      await step.do('mark backtest running', async () => {
        await markBacktestRunningById(this.env, backtest.id);
      });

      const summary = await step.do('execute and persist backtest', async () => {
        const existing = await findBacktestByIdForWorkflow(this.env, backtest.id);

        if (existing?.status === 'completed') {
          return {
            finalBalance: existing.final_balance,
            tradeCount: 0,
            winRate: existing.win_rate,
          };
        }

        const config = await resolveBacktestExecutionConfig({
          env: this.env,
          userId: backtest.user_id,
          symbol: backtest.symbol,
          exchange: backtest.exchange,
          strategy: backtest.strategy,
          startDate: backtest.start_date,
          endDate: backtest.end_date,
          initialBalance: backtest.initial_balance,
          parameters,
        });
        const result = await runBacktest(this.env, config);
        await completeBacktestRunById(this.env, backtest.id, result);

        return {
          finalBalance: result.finalBalance,
          tradeCount: result.trades.length,
          winRate: result.metrics.winRate,
        };
      });

      return {
        backtestId: backtest.id,
        status: 'completed',
        ...summary,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backtest workflow failed';

      await step.do('mark backtest failed', async () => {
        await markBacktestFailedById(this.env, backtest.id, message);
      });

      throw error;
    }
  }
}