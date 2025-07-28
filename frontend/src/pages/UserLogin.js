import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserLogin.css';

const UserLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetData, setResetData] = useState({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/user/login', {
        User_Email: email,
        User_Password: password
      });
      localStorage.setItem('token', response.data.token);
      navigate('/home');
    } catch (err) {
      setError('Invalid email or password');
      console.error('Login error:', err);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    if (resetData.newPassword !== resetData.confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    if (resetData.newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    try {
      const response = await axios.put('http://localhost:5000/api/users/reset-password', {
        User_Name: resetData.name,
        User_Email: resetData.email,
        User_Number: resetData.phone,
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

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const toggleShowResetPassword = () => {
    setShowResetPassword(prev => !prev);
  };

  return (
    <div className="UserLoginContainer">
      <div className="UserLoginBox">
        {!showResetForm ? (
          <>
            <h1 className="UserLoginTitle">User Login</h1>
            <form onSubmit={handleSubmit} className="UserLoginForm">
              <div className="UserLoginFormGroup">
                <label className="UserLoginLabel">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="UserLoginInput UserLoginEmailInput"
                  required
                />
              </div>
              <div className="UserLoginFormGroup">
                <label className="UserLoginLabel">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="UserLoginInput"
                  required
                />
                <label className="ShowPasswordLabel">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={toggleShowPassword}
                  /> Show Password
                </label>
              </div>
              {error && <p className="UserLoginErrorMessage">{error}</p>}
              <button type="submit" className="UserLoginButton">Login</button>
            </form>
            <p className="UserLoginSignupLink">
              Don't have an account? <span
                className="UserLoginSignupText"
                onClick={() => navigate('/signup')}
              >
                Sign up
              </span>
            </p>
            <p className="UserLoginForgotPassword">
              <span
                className="UserLoginForgotPasswordText"
                onClick={() => setShowResetForm(true)}
              >
                Forgot password?
              </span>
            </p>
          </>
        ) : (
          <>
            <h1 className="UserLoginTitle">Reset Password</h1>
            {resetSuccess ? (
              <div className="UserLoginSuccessMessage">
                Password reset successfully! You can now login with your new password.
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="UserLoginForm">
                <div className="UserLoginFormGroup">
                  <label className="UserLoginLabel">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={resetData.name}
                    onChange={handleResetInputChange}
                    className="UserLoginInput"
                    required
                  />
                </div>
                <div className="UserLoginFormGroup">
                  <label className="UserLoginLabel">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your registered email"
                    value={resetData.email}
                    onChange={handleResetInputChange}
                    className="UserLoginInput"
                    required
                  />
                </div>
                <div className="UserLoginFormGroup">
                  <label className="UserLoginLabel">Phone Number (XXXX-XXXXXXX)</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={resetData.phone}
                    onChange={handleResetInputChange}
                    className="UserLoginInput"
                    pattern="\d{4}-\d{7}"
                    required
                  />
                </div>
                <div className="UserLoginFormGroup">
                  <label className="UserLoginLabel">New Password</label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    name="newPassword"
                    placeholder="Enter new password"
                    value={resetData.newPassword}
                    onChange={handleResetInputChange}
                    className="UserLoginInput"
                    required
                    minLength="8"
                  />
                  <label className="ShowPasswordLabel">
                    <input
                      type="checkbox"
                      checked={showResetPassword}
                      onChange={toggleShowResetPassword}
                    /> Show Password
                  </label>
                </div>
                <div className="UserLoginFormGroup">
                  <label className="UserLoginLabel">Confirm Password</label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    value={resetData.confirmPassword}
                    onChange={handleResetInputChange}
                    className="UserLoginInput"
                    required
                    minLength="8"
                  />
                </div>
                {resetError && <p className="UserLoginErrorMessage">{resetError}</p>}
                <div className="UserLoginButtonGroup">
                  <button type="submit" className="UserLoginButton">Reset Password</button>
                  <button
                    type="button"
                    className="UserLoginCancelButton"
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

export default UserLogin;