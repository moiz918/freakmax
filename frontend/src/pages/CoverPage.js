import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CoverPage.css';

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="freakmax-container">
      <div className="freakmax-header">
        <h1 className="freakmax-title">FREAKMAX</h1>
        <h2 className="freakmax-subtitle">Edge You at the Movies: Cinephiles Rizz Party</h2>
      </div>

      <div className="freakmax-content">
        <div className="freakmax-buttons">
          <button 
            className="freakmax-button user-button"
            onClick={() => navigate('/login')}
          >
            User Login
          </button>
          <button 
            className="freakmax-button user-button"
            onClick={() => navigate('/signup')}
          >
            User Signup
          </button>
          <button 
            className="freakmax-button admin-button"
            onClick={() => navigate('/admin/signup')}
          >
            Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainPage;