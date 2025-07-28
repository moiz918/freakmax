import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetData, setResetData] = useState({
    username: '',
    adminKey: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/admin/login', {
        Username: username,
        Password: password
      });

      localStorage.setItem('token', response.data.token);
      navigate('/admin-dashboard');
    } catch (err) {
      setError('Invalid username or password');
      console.error('Admin login error:', err);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');

    // Validate inputs
    if (resetData.newPassword !== resetData.confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    if (resetData.newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }

    try {
      const response = await axios.put('http://localhost:5000/api/admins/reset-password', {
        Username: resetData.username,
        AdminKey: resetData.adminKey,
        newPassword: resetData.newPassword
      });

      if (response.data.success) {
        setResetSuccess(true);
        setTimeout(() => {
          setShowResetForm(false);
          setResetSuccess(false);
        }, 3000);
      } else {
        setResetError(response.data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset error:', err);
      setResetError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleResetInputChange = (e) => {
    const { name, value } = e.target;
    setResetData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="login-container2">
      <div className="login-box2 admin-login-box2">
        {!showResetForm ? (
          <>
            <h1 className="login-title2">Admin Login</h1>
            <form onSubmit={handleSubmit} className="login-form2">
              <div className="form-group2">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group2">
                <label>Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="toggle-password2">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  <label htmlFor="showPassword">Show Password</label>
                </div>
              </div>
              {error && <p className="error-message2">{error}</p>}
              <button type="submit" className="login-button2 admin-login-button2">
                Login
              </button>
            </form>
            <p className="forgot-password-link">
              <span onClick={() => setShowResetForm(true)}>Reset Password</span>
            </p>
            <p className="switch-link">
              User? <span onClick={() => navigate('/login')}>Login here</span>
            </p>
          </>
        ) : (
          <>
            <h1 className="login-title2">Admin Password Reset</h1>
            {resetSuccess ? (
              <div className="success-message2">
                Password reset successfully! You can now login with your new password.
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="login-form2">
                <div className="form-group2">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="Enter admin username"
                    value={resetData.username}
                    onChange={handleResetInputChange}
                    required
                  />
                </div>
                <div className="form-group2">
                  <label>Admin Key</label>
                  <input
                    type="password"
                    name="adminKey"
                    placeholder="Enter admin key"
                    value={resetData.adminKey}
                    onChange={handleResetInputChange}
                    required
                  />
                </div>
                <div className="form-group2">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="Enter new password (min 8 chars)"
                    value={resetData.newPassword}
                    onChange={handleResetInputChange}
                    required
                    minLength="8"
                  />
                </div>
                <div className="form-group2">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={resetData.confirmPassword}
                    onChange={handleResetInputChange}
                    required
                    minLength="8"
                  />
                </div>
                {resetError && <p className="error-message2">{resetError}</p>}
                <div className="button-group2">
                  <button type="submit" className="login-button2 admin-login-button2">
                    Reset Password
                  </button>
                  <button
                    type="button"
                    className="cancel-button2"
                    onClick={() => setShowResetForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;