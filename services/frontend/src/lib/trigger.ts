import { TriggerClient } from '@trigger.dev/sdk';

export const client = new TriggerClient({
  id: 'quantago',
  apiKey: process.env.TRIGGER_API_KEY || '',
  apiUrl: process.env.TRIGGER_API_URL || 'https://api.trigger.dev',
});

// Job to process Dukascopy data in batches
export const processDukascopyData = client.defineJob({
  id: 'process-dukascopy-data',
  name: 'Process Dukascopy Data',
  version: '1.0.0',
  trigger: client.triggers.webhook({
    name: 'dukascopy.data.process',
  }),
  run: async (payload, io) => {
    const { symbol, startTime, endTime, timeframe } = payload;
    
    // Log start of processing
    await io.logger.info('Starting Dukascopy data processing', {
      symbol,
      startTime,
      endTime,
      timeframe
    });

    try {
      // Break the date range into smaller chunks
      const chunks = await io.runTask('split-date-range', async () => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const chunkSize = 24 * 60 * 60 * 1000; // 1 day in milliseconds
        const chunks = [];

        for (let current = start; current < end; current = new Date(current.getTime() + chunkSize)) {
          chunks.push({
            start: current.toISOString(),
            end: new Date(Math.min(current.getTime() + chunkSize, end.getTime())).toISOString()
          });
        }

        return chunks;
      });

      // Process each chunk in parallel
      await io.runTask('process-chunks', async () => {
        const results = await Promise.all(chunks.map(async (chunk, index) => {
          // Add delay between chunks to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, index * 1000));

          return io.runTask(`process-chunk-${index}`, async () => {
            const client = DukascopyClient.getInstance();
            return client.getTicks(symbol, new Date(chunk.start), new Date(chunk.end), timeframe);
          });
        }));

        return results;
      });

      await io.logger.info('Completed Dukascopy data processing', {
        symbol,
        chunksProcessed: chunks.length
      });

    } catch (error) {
      await io.logger.error('Error processing Dukascopy data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol
      });
      throw error;
    }
  }
});

// Job to aggregate processed data
export const aggregateDukascopyData = client.defineJob({
  id: 'aggregate-dukascopy-data',
  name: 'Aggregate Dukascopy Data',
  version: '1.0.0',
  trigger: client.triggers.webhook({
    name: 'dukascopy.data.aggregate',
  }),
  run: async (payload, io) => {
    const { symbol, timeframe } = payload;

    await io.logger.info('Starting data aggregation', { symbol, timeframe });

    try {
      // Fetch all processed data for the symbol
      const { data: processedData, error } = await io.supabase
        .from('dukascopy_ticks')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Aggregate data based on timeframe
      const aggregated = await io.runTask('aggregate-data', async () => {
        return aggregateByTimeframe(processedData, timeframe);
      });

      // Store aggregated data
      await io.runTask('store-aggregated-data', async () => {
        const { error } = await io.supabase
          .from('dukascopy_aggregated')
          .insert(aggregated);

        if (error) throw error;
      });

      await io.logger.info('Completed data aggregation', {
        symbol,
        recordsProcessed: processedData.length,
        aggregatedRecords: aggregated.length
      });

    } catch (error) {
      await io.logger.error('Error aggregating data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol
      });
      throw error;
    }
  }
});

function aggregateByTimeframe(data: any[], timeframe: string) {
  // Implementation similar to existing aggregateDataByTimeframe function
  // but optimized for batch processing
  const grouped = new Map();
  
  data.forEach(tick => {
    const key = getTimeframeKey(new Date(tick.timestamp), timeframe);
    if (!grouped.has(key)) {
      grouped.set(key, {
        prices: [],
        volume: 0
      });
    }
    const group = grouped.get(key);
    group.prices.push((tick.bid + tick.ask) / 2);
    group.volume += tick.bid_volume + tick.ask_volume;
  });

  return Array.from(grouped.entries()).map(([timestamp, data]) => ({
    timestamp: new Date(timestamp),
    open: data.prices[0],
    high: Math.max(...data.prices),
    low: Math.min(...data.prices),
    close: data.prices[data.prices.length - 1],
    volume: data.volume
  }));
}

function getTimeframeKey(date: Date, timeframe: string): string {
  const d = new Date(date);
  switch (timeframe) {
    case '1m': return d.setSeconds(0, 0);
    case '5m': return d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0);
    case '15m': return d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
    case '1h': return d.setMinutes(0, 0, 0);
    case '4h': return d.setHours(Math.floor(d.getHours() / 4) * 4, 0, 0, 0);
    case '1d': return d.setHours(0, 0, 0, 0);
    default: return d.setSeconds(0, 0);
  }
}