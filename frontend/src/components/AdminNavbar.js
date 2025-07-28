import { Link, useNavigate, useLocation } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  // Function to check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar" style={{ 
      backgroundColor: '#333',
      padding: '10px 20px',
      color: 'white'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div className="nav-links" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <Link 
            to="/admin-dashboard" 
            style={{ 
              color: isActive('/admin-dashboard') ? '#4CAF50' : 'white', 
              textDecoration: 'none',
              fontWeight: isActive('/admin-dashboard') ? 'bold' : 'normal',
              borderBottom: isActive('/admin-dashboard') ? '2px solid #4CAF50' : 'none',
              paddingBottom: '2px'
            }}
          >
            Dashboard
          </Link>
          
          <Link 
            to="/admin/movies" 
            style={{ 
              color: isActive('/admin/movies') ? '#4CAF50' : 'white', 
              textDecoration: 'none',
              fontWeight: isActive('/admin/movies') ? 'bold' : 'normal',
              borderBottom: isActive('/admin/movies') ? '2px solid #4CAF50' : 'none',
              paddingBottom: '2px'
            }}
          >
            Movies
          </Link>
          
          {/* Repeat for all other links with the same pattern */}
          <Link 
            to="/admin/cinemas" 
            style={{ 
              color: isActive('/admin/cinemas') ? '#4CAF50' : 'white', 
              textDecoration: 'none',
              fontWeight: isActive('/admin/cinemas') ? 'bold' : 'normal',
              borderBottom: isActive('/admin/cinemas') ? '2px solid #4CAF50' : 'none',
              paddingBottom: '2px'
            }}
          >
            Cinemas
          </Link>
          
          <Link 
            to="/admin/shows" 
            style={{ 
              color: isActive('/admin/shows') ? '#4CAF50' : 'white', 
              textDecoration: 'none',
              fontWeight: isActive('/admin/shows') ? 'bold' : 'normal',
              borderBottom: isActive('/admin/shows') ? '2px solid #4CAF50' : 'none',
              paddingBottom: '2px'
            }}
          >
            Shows
          </Link>
          
          {/* Continue with the rest of your links */}
          {['bookings', 'screenseattypes', 'payments', 'screens', 'seats', 'users', 'complaints'].map((route) => (
            <Link 
              key={route}
              to={`/admin/${route}`}
              style={{ 
                color: isActive(`/admin/${route}`) ? '#4CAF50' : 'white', 
                textDecoration: 'none',
                fontWeight: isActive(`/admin/${route}`) ? 'bold' : 'normal',
                borderBottom: isActive(`/admin/${route}`) ? '2px solid #4CAF50' : 'none',
                paddingBottom: '2px'
              }}
            >
              {route.split(/(?=[A-Z])/).join(' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Link>
          ))}
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '5px 10px',
            backgroundColor: '#d9534f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default AdminNavbar;