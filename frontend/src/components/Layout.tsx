import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OfflineIndicator from './OfflineIndicator';
import ThemeSwitcher from './ThemeSwitcher';
import { getCachedStudent } from '../utils/offlineSync';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const student = getCachedStudent();

  const handleLogout = () => {
    localStorage.removeItem('learnquest-student');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4">
            <h1 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-0">
              <Link to="/" className="hover:text-red-200 !text-white transition-colors font-bold">
                🎓 LearnQuest Africa
              </Link>
            </h1>
            <nav className="flex flex-wrap gap-2 lg:gap-1 items-center">
              <Link to="/" className="!text-white hover:bg-blue-800 px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200">
                🏠 Home
              </Link>
              <Link to="/game" className="!text-white hover:bg-blue-800 px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200">
                🎮 Game
              </Link>
              <Link to="/progress" className="!text-white hover:bg-blue-800 px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200">
                📈 Progress
              </Link>
              <Link to="/leaderboard" className="!text-white hover:bg-blue-800 px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200">
                🏆 Leaderboard
              </Link>
              <Link to="/admin" className="!text-white hover:bg-blue-800 px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200">
                ⚙️ Admin
              </Link>
              <ThemeSwitcher />
              {student && (
                <button onClick={handleLogout} className="text-white hover:bg-blue-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                  Logout
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl w-full">
        {children}
      </main>
      <OfflineIndicator />
    </div>
  );
};

export default Layout;
