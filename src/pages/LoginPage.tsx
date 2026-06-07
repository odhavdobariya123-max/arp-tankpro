import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (login(username, password)) {
        toast.success('Login successful');
      } else {
        toast.error('Invalid credentials');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-8">
            <div className="bg-blue-600 p-4 rounded-full">
              <LogIn className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">ARP TankPro</h1>
          <p className="text-center text-gray-600 mb-8">ERP Management System</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="admin"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="••••"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2 font-semibold">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Admin: admin / 1234</p>
              <p>Partner: partner / 1234</p>
              <p>Staff: staff / 1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
