import { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface IngestionEvent {
  id: string;
  timestamp: string;
  symbol?: string;
  assetType?: string;
  status: string;
  message: string;
  rowsWritten?: number;
}

export function AdminDashboard() {
  const [events, setEvents] = useState<IngestionEvent[]>([]);
  const [symbol, setSymbol] = useState('BTC-USD');
  const [fromDate, setFromDate] = useState('2026-02-01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    // Connect to SSE endpoint for realtime updates
    const eventSource = new EventSource(`${apiBaseUrl}/api/admin/ingestion/events`, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents(prev => [data, ...prev].slice(0, 50)); // Keep last 50 events
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [apiBaseUrl]);

  const handleRunIngestion = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/ingestion/run-once`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          assetType: 'crypto',
          timeframe: '1h',
          fromDate: `${fromDate}T00:00:00.000Z`,
        }),
      });

      if (!response.ok) {
        throw new Error('Ingestion request failed');
      }

      const result = await response.json();
      
      setEvents(prev => [{
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        symbol,
        assetType: 'crypto',
        status: 'success',
        message: `Ingestion completed: ${result.rowsWritten} rows written`,
        rowsWritten: result.rowsWritten,
      }, ...prev].slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run ingestion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run Ingestion</CardTitle>
            <CardDescription>
              Manually trigger data ingestion for a specific symbol
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunIngestion();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="BTC-USD"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? 'Running...' : 'Run Ingestion'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Realtime Events</CardTitle>
            <CardDescription>
              Live updates from ingestion processes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events yet. Run an ingestion to see updates.
                </p>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg bg-white space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          event.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'error'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    {event.symbol && (
                      <div className="text-sm font-medium">{event.symbol} ({event.assetType})</div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {event.message}
                    </div>
                    {event.rowsWritten !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Rows: {event.rowsWritten}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
