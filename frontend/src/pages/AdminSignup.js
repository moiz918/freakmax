import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminSignup.css';

const AdminSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    AdminKey: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.Username || !formData.Password || !formData.AdminKey) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.Password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/admin/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error creating admin account');
      }
      
      if (data.message === 'Admin created successfully') {
        alert('Admin account created successfully!');
        navigate('/admin/login');
      }
    } catch (err) {
      if (err.message === 'Invalid admin key') {
        setError('Invalid admin key');
      } else if (err.message === 'Admin already exists') {
        setError('Username already exists');
      } else if (!navigator.onLine) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Server error: ' + err.message);
      }
      console.error('Admin signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="AdminSignupContainer">
      <div className="AdminSignupForm">
        <h2 className="AdminSignupTitle">Create Admin Account</h2>
        <p className="AdminSignupNotice">Admin privileges require verification</p>
        {error && <div className="AdminSignupError">{error}</div>}
        
        <form onSubmit={handleSubmit} className="AdminSignupFormElement">
          <div className="AdminSignupFormGroup">
            <label htmlFor="Username" className="AdminSignupLabel">Username *</label>
            <input
              type="text"
              id="Username"
              name="Username"
              value={formData.Username}
              onChange={handleChange}
              className="AdminSignupInput AdminSignupUsernameInput"
              required
            />
          </div>

          <div className="AdminSignupFormGroup">
            <label htmlFor="Password" className="AdminSignupLabel">Password (min 6 characters) *</label>
            <input
              type="password"
              id="Password"
              name="Password"
              value={formData.Password}
              onChange={handleChange}
              className="AdminSignupInput"
              minLength="6"
              required
            />
          </div>

          <div className="AdminSignupFormGroup">
            <label htmlFor="AdminKey" className="AdminSignupLabel">Admin Key *</label>
            <input
              type="password"
              id="AdminKey"
              name="AdminKey"
              value={formData.AdminKey}
              onChange={handleChange}
              className="AdminSignupInput"
              required
            />
          </div>

          <div className="AdminSignupActions">
            <button 
              type="submit" 
              disabled={loading} 
              className="AdminSignupButton"
            >
              {loading ? 'Creating Admin Account...' : 'Register Admin'}
            </button>
            <button 
              type="button" 
              className="AdminSignupLoginButton"
              onClick={() => navigate('/admin/login')}
            >
              Already an Admin? Login Here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSignup;