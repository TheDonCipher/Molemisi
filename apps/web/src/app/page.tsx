import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-bold mb-4 text-molemisi-accent">🌾 Molemisi</h1>
      <p className="text-xl text-molemisi-muted mb-8 text-center max-w-md">
        A pixel-art farm management simulator inspired by Botswana
      </p>

      <div className="flex flex-col gap-4">
        <Link
          href="/auth/login"
          className="px-8 py-4 bg-molemisi-accent text-molemisi-night font-bold rounded-lg hover:bg-molemisi-sunset transition-colors text-center"
        >
          Start Farming
        </Link>
        <Link
          href="/auth/register"
          className="px-8 py-4 border-2 border-molemisi-border text-molemisi-text rounded-lg hover:border-molemisi-accent transition-colors text-center"
        >
          Create Account
        </Link>
      </div>

      <div className="mt-16 text-molemisi-muted text-sm text-center">
        <p>🌱 Crops • 🐄 Livestock • 🏠 Buildings • 🌳 Bushveld</p>
      </div>
    </div>
  );
}
