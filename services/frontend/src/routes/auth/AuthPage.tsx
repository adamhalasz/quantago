import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { signIn, signUp } from './auth-api';
import { useAuthSession } from './auth-hooks';

export function AuthPage() {
	const [, navigate] = useLocation();
	const { session, isPending } = useAuthSession();
	const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [formData, setFormData] = React.useState({
		name: '',
		email: '',
		password: '',
	});

	React.useEffect(() => {
		if (session?.user) {
			navigate('/');
		}
	}, [navigate, session]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError(null);

		try {
			if (mode === 'signup') {
				const result = await signUp.email({
					name: formData.name,
					email: formData.email,
					password: formData.password,
				});

				if (result.error) {
					throw new Error(result.error.message);
				}
			} else {
				const result = await signIn.email({
					email: formData.email,
					password: formData.password,
				});

				if (result.error) {
					throw new Error(result.error.message);
				}
			}

			navigate('/');
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-gray-900">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
				<p className="mt-2 text-sm text-gray-600">
					{mode === 'signin'
						? 'Authenticate to access saved backtests and bots.'
						: 'Create an account to store your trading data in Neon.'}
				</p>
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
			) : null}

			<form className="space-y-4" onSubmit={handleSubmit}>
				{mode === 'signup' ? (
					<div>
						<label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
						<input
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={formData.name}
							onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
							autoComplete="name"
							required
						/>
					</div>
				) : null}

				<div>
					<label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
					<input
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						type="email"
						value={formData.email}
						onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
						autoComplete="email"
						required
					/>
				</div>

				<div>
					<label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
					<input
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						type="password"
						value={formData.password}
						onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
						autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
						required
						minLength={6}
					/>
				</div>

				<Button className="w-full" disabled={loading || isPending} type="submit">
					{loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
				</Button>
			</form>

			<div className="mt-6 text-sm text-gray-600">
				{mode === 'signin' ? 'Need an account?' : 'Already have an account?'}{' '}
				<button
					className="font-medium text-indigo-600"
					onClick={() => setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))}
					type="button"
				>
					{mode === 'signin' ? 'Create one' : 'Sign in'}
				</button>
			</div>
		</div>
	);
}