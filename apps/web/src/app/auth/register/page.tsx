'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Registration failed');
        return;
      }

      // Store token and redirect to game
      localStorage.setItem('molemisi_token', data.data.token);
      localStorage.setItem('token', data.data.token);
      window.location.href = '/game';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="flex items-center justify-center gap-3 mb-8">
        <img
          src="/assets/branding/logo.png"
          alt="Molemisi"
          width={56}
          height={56}
          className="w-14 h-14"
          style={{ imageRendering: 'pixelated' }}
        />
        <h1 className="text-4xl font-bold text-molemisi-accent">Molemisi</h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-molemisi-muted mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-molemisi-panel border border-molemisi-border rounded-lg text-molemisi-text focus:outline-none focus:border-molemisi-accent"
            required
          />
        </div>

        <div>
          <label className="block text-molemisi-muted mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-molemisi-panel border border-molemisi-border rounded-lg text-molemisi-text focus:outline-none focus:border-molemisi-accent"
            required
          />
        </div>

        <div>
          <label className="block text-molemisi-muted mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-molemisi-panel border border-molemisi-border rounded-lg text-molemisi-text focus:outline-none focus:border-molemisi-accent"
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-molemisi-accent text-molemisi-night font-bold rounded-lg hover:bg-molemisi-sunset transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-8 text-molemisi-muted">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-molemisi-accent hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
