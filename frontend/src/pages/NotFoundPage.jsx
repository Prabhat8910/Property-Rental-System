import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-center px-4">
      <div>
        <p className="text-8xl mb-6">🏚️</p>
        <h1 className="font-display text-5xl text-gray-900 mb-3">404</h1>
        <p className="text-xl text-gray-600 mb-2">Page Not Found</p>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
