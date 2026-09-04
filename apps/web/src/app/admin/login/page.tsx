'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = 'http://localhost:3001/api/v1';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }

      // Verify this is an admin account by testing the admin endpoint
      const token = data.data?.token;
      if (!token) {
        setError('Invalid response from server');
        return;
      }

      // Check admin access
      const adminCheck = await fetch(`${API_BASE}/admin/economy`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!adminCheck.ok) {
        setError('Access denied. Admin privileges required.');
        return;
      }

      // Store admin session
      localStorage.setItem('molemisi_admin_token', token);
      localStorage.setItem('molemisi_admin_email', email);
      router.push('/admin');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#210e0b] px-4">
      {/* Lock icon */}
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="font-headline text-xl text-primary uppercase font-bold mb-1">Admin Access</h1>
      <p className="font-body text-sm text-on-surface-variant mb-8 text-center max-w-xs">
        This area is restricted to authorized administrators.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block font-mono text-xs text-on-surface-variant uppercase mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-wood-dark border border-wood-border rounded-lg text-cream-surface font-mono text-sm focus:outline-none focus:border-primary"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block font-mono text-xs text-on-surface-variant uppercase mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-wood-dark border border-wood-border rounded-lg text-cream-surface font-mono text-sm focus:outline-none focus:border-primary"
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-primary text-wood-dark font-headline text-sm uppercase font-bold rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Access Admin Panel'}
        </button>
      </form>

      <p className="mt-8 font-mono text-[10px] text-on-surface-variant text-center">
        Admin accounts are separate from player accounts.
        <br />
        Contact the system administrator for access.
      </p>
    </div>
  );
}
