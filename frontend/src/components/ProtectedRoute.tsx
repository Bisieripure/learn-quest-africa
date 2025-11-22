import { Navigate, Outlet } from 'react-router-dom';
import { getCachedStudent } from '../utils/offlineSync';

const ProtectedRoute = () => {
  const student = getCachedStudent();

  return student ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;
