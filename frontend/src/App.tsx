import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Game from './pages/Game';
import Progress from './pages/Progress';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/game" element={<Game />} />
            <Route path="/progress" element={<Progress />} />
          </Route>
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
