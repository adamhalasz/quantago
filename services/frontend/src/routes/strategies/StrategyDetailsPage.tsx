import React from 'react';
import { useLocation, useParams } from 'wouter';
import { Brain, ArrowLeft, LineChart, Target, Clock, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { Chart } from 'react-google-charts';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useStrategiesCatalog } from './strategies-hooks';

const runtimeLabels = {
	native: 'Native Runtime',
	remote: 'Remote Runtime',
	wasm: 'WASM Runtime',
} as const;

const runtimeDescriptions = {
	native: 'Runs directly inside the platform runtime with the lowest overhead.',
	remote: 'Runs behind the Strategy Protocol HTTP boundary so any language can participate.',
	wasm: 'Reserved for portable high-performance strategies compiled to WebAssembly.',
} as const;

export function StrategyDetailsPage() {
	const { name } = useParams();
	const [, navigate] = useLocation();
	const { data: strategies, run } = useStrategiesCatalog();
	const strategy = strategies.find((item) => item.name === decodeURIComponent(name || ''));

	React.useEffect(() => {
		void run();
	}, [run]);

	if (!strategy) {
		return (
			<div className="p-8">
				<div className="text-red-600 mb-4">Strategy not found</div>
				<Button onClick={() => navigate('/strategies')} variant="outline">
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Strategies
				</Button>
			</div>
		);
	}

	const chartData = [
		['Date', 'Price', 'Buy Signal', 'Sell Signal'],
		['2024-01', 100, null, null],
		['2024-02', 120, 120, null],
		['2024-03', 110, null, 110],
		['2024-04', 130, 130, null],
		['2024-05', 125, null, 125],
		['2024-06', 140, null, null],
	];

	return (
		<div className="max-w-7xl mx-auto px-4 py-8">
			<div className="flex justify-between items-start mb-8">
				<div>
					<div className="flex items-center gap-2 mb-4">
						<Button onClick={() => navigate('/strategies')} variant="outline" size="sm">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back
						</Button>
						<Badge variant="secondary" className="text-xs">
							{strategy.defaultFrequency}
						</Badge>
						<Badge variant="outline" className="text-xs">
							{strategy.runtime.language}
						</Badge>
					</div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">{strategy.name}</h1>
					<p className="text-lg text-gray-600">{strategy.description}</p>
				</div>
				<Brain className="w-16 h-16 text-indigo-600" />
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 space-y-8">
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold mb-4">Strategy Overview</h2>
						<div className="prose max-w-none">
							<p className="text-gray-600">
								The {strategy.name} is designed to capitalize on {strategy.description.toLowerCase()} This strategy is published as version {strategy.version} and currently runs through the {runtimeLabels[strategy.runtime.type].toLowerCase()}.
							</p>
							<p className="text-gray-600">
								{runtimeDescriptions[strategy.runtime.type]} This approach is particularly effective in{' '}
								{strategy.defaultFrequency === 'scalping'
									? 'short-term, high-frequency trading environments'
									: strategy.defaultFrequency === 'daily'
										? 'day trading scenarios'
										: strategy.defaultFrequency === 'weekly'
											? 'swing trading timeframes'
											: 'longer-term position trading'}.
							</p>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold mb-4">Protocol Guide</h2>
						<div className="space-y-4">
							<div className="flex items-start gap-4">
								<div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
									<span className="text-indigo-600 font-semibold">1</span>
								</div>
								<div>
									<h3 className="font-medium text-gray-900">Runtime Contract</h3>
									<p className="text-gray-600 mt-1">The platform sends one candle at a time plus bounded history and the current portfolio snapshot.</p>
									<ul className="mt-2 space-y-2">
										{strategy.indicators.map((indicator) => (
											<li key={indicator} className="flex items-center text-sm text-gray-600">
												<LineChart className="w-4 h-4 mr-2 text-indigo-600" />
												{indicator}
											</li>
										))}
									</ul>
								</div>
							</div>

							<div className="flex items-start gap-4">
								<div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
									<span className="text-indigo-600 font-semibold">2</span>
								</div>
								<div>
									<h3 className="font-medium text-gray-900">Signal Output</h3>
									<ul className="mt-2 space-y-2">
										<li className="flex items-center text-sm text-gray-600">
											<TrendingUp className="w-4 h-4 mr-2 text-green-600" />
											Buy Signal: return `BUY` with an optional position size and reason.
										</li>
										<li className="flex items-center text-sm text-gray-600">
											<TrendingDown className="w-4 h-4 mr-2 text-red-600" />
											Sell Signal: return `SELL`; otherwise return `HOLD` to leave execution unchanged.
										</li>
									</ul>
								</div>
							</div>

							<div className="flex items-start gap-4">
								<div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
									<span className="text-indigo-600 font-semibold">3</span>
								</div>
								<div>
									<h3 className="font-medium text-gray-900">Default Execution Parameters</h3>
									<ul className="mt-2 space-y-2">
										<li className="flex items-center text-sm text-gray-600">
											<Target className="w-4 h-4 mr-2 text-indigo-600" />
											Take Profit: {strategy.getDefaultConfig().takeProfitLevel}% from entry
										</li>
										<li className="flex items-center text-sm text-gray-600">
											<Scale className="w-4 h-4 mr-2 text-indigo-600" />
											Stop Loss: {strategy.getDefaultConfig().stopLossLevel}% from entry
										</li>
									</ul>
								</div>
							</div>

							<div className="flex items-start gap-4">
								<div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
									<span className="text-indigo-600 font-semibold">4</span>
								</div>
								<div>
									<h3 className="font-medium text-gray-900">History Requirements</h3>
									<ul className="mt-2 space-y-2">
										<li className="flex items-center text-sm text-gray-600">
											<Clock className="w-4 h-4 mr-2 text-indigo-600" />
											Recommended timeframe: {strategy.recommendedTimeframe} · Minimum candles: {strategy.minCandles} · Lookback window: {strategy.lookbackCandles}
										</li>
									</ul>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-xl font-semibold mb-4">Strategy Performance</h2>
						<Chart
							chartType="LineChart"
							width="100%"
							height="400px"
							data={chartData}
							options={{
								title: 'Example Trade Signals',
								legend: { position: 'bottom' },
								series: {
									0: { color: '#6366f1' },
									1: { color: '#22c55e', pointShape: 'triangle' },
									2: { color: '#ef4444', pointShape: 'triangle' },
								},
								pointSize: 10,
							}}
						/>
					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-lg font-semibold mb-4">Key Parameters</h2>
						<div className="space-y-4">
							<div>
								<div className="text-sm text-gray-600">Recommended Timeframe</div>
								<div className="font-medium">{strategy.recommendedTimeframe}</div>
							</div>
							<Separator />
							<div>
								<div className="text-sm text-gray-600">Runtime</div>
								<div className="font-medium">{runtimeLabels[strategy.runtime.type]} · {strategy.runtime.language}</div>
							</div>
							<Separator />
							<div>
								<div className="text-sm text-gray-600">Take Profit Target</div>
								<div className="font-medium">{strategy.getDefaultConfig().takeProfitLevel}%</div>
							</div>
							<Separator />
							<div>
								<div className="text-sm text-gray-600">Stop Loss Level</div>
								<div className="font-medium">{strategy.getDefaultConfig().stopLossLevel}%</div>
							</div>
							<Separator />
							<div>
								<div className="text-sm text-gray-600">Key Indicators</div>
								<div className="flex flex-wrap gap-2 mt-2">
									{strategy.indicators.map((indicator) => (
										<Badge key={indicator} variant="secondary">
											{indicator}
										</Badge>
									))}
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
						<h2 className="text-lg font-semibold mb-4">Best Market Conditions</h2>
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<div className="w-2 h-2 rounded-full bg-green-500"></div>
								{strategy.runtime.type === 'remote' ? 'Strategies that depend on external research libraries or custom infrastructure' : 'Strategies that fit the built-in execution profile'}
							</div>
							<div className="flex items-center gap-2 text-sm text-gray-600">
								<div className="w-2 h-2 rounded-full bg-red-500"></div>
								{strategy.runtime.type === 'remote' ? 'Environments with unreliable network access or slow response times' : 'Market conditions that do not match the strategy assumptions'}
							</div>
						</div>
					</div>

					<div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
						<h2 className="text-lg font-semibold text-amber-800 mb-2">Risk Warning</h2>
						<p className="text-sm text-amber-700">
							Past performance is not indicative of future results. Trading involves substantial risk of loss. Always use proper risk management and never risk more than you can afford to lose.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}