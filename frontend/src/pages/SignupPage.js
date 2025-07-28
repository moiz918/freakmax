import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Signup.css';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    User_Name: '',
    User_Email: '',
    User_Password: '',
    User_Number: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    if (!formData.User_Name || !formData.User_Email || !formData.User_Password) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }
  
    if (formData.User_Password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
  
    try {
      const response = await axios.post('http://localhost:5000/user/signup', formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.message === 'User created successfully') {
        alert('Signup successful! Please login.');
        navigate('/login');
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          setError(err.response.data.message || 'Email already registered');
        } else if (err.response.data && err.response.data.error) {
          setError(`Server error: ${err.response.data.error}`);
        } else {
          setError('Signup failed. Please try again later.');
        }
      } else if (err.request) {
        setError('No response from server. Is the backend running?');
      } else {
        setError('Error setting up request: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="UserSignupContainer">
      <div className="UserSignupForm">
        <h2 className="UserSignupTitle">Create Your Account</h2>
        {error && <div className="UserSignupErrorMessage">{error}</div>}
        
        <form onSubmit={handleSubmit} className="UserSignupFormElement">
          <div className="UserSignupFormGroup">
            <label htmlFor="User_Name" className="UserSignupLabel">Full Name</label>
            <input
              type="text"
              id="User_Name"
              name="User_Name"
              value={formData.User_Name}
              onChange={handleChange}
              className="UserSignupInput"
              required
            />
          </div>

          <div className="UserSignupFormGroup">
            <label htmlFor="User_Email" className="UserSignupLabel">Email</label>
            <input
              type="email"
              id="User_Email"
              name="User_Email"
              value={formData.User_Email}
              onChange={handleChange}
              className="UserSignupInput"
              required
            />
          </div>

          <div className="UserSignupFormGroup">
            <label htmlFor="User_Password" className="UserSignupLabel">Password (min 6 characters)</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="User_Password"
              name="User_Password"
              value={formData.User_Password}
              onChange={handleChange}
              className="UserSignupInput"
              minLength="6"
              required
            />
            <div className="UserSignupShowPassword">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={toggleShowPassword}
              />
              <label htmlFor="showPassword">Show Password</label>
            </div>
          </div>

          <div className="UserSignupFormGroup">
            <label htmlFor="User_Number" className="UserSignupLabel">Phone Number</label>
            <input
              type="tel"
              id="User_Number"
              name="User_Number"
              value={formData.User_Number}
              onChange={handleChange}
              className="UserSignupInput"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="UserSignupButton"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="UserSignupLoginLink">
          Already have an account? <span 
            className="UserSignupLoginText"
            onClick={() => navigate('/login')}
          >
            Log in
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;