import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminInfo, setAdminInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    Username: '',
    Password: '',
    ConfirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/admins/me', {
          headers: { Authorization: `Bearer ${token}`}
        });
        setAdminInfo(response.data.admin);
        setFormData({
          Username: response.data.admin.Username,
          Password: '',
          ConfirmPassword: ''
        });
      } catch (err) {
        console.error('Error fetching admin info:', err);
      }
    };

    fetchAdminInfo();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.Password && formData.Password !== formData.ConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:5000/api/admins/${adminInfo.Admin_ID}`,
        {
          Username: formData.Username,
          ...(formData.Password && { Password: formData.Password })
        },
        {
          headers: { Authorization: `Bearer ${token}`}
        }
      );

      setSuccess(response.data.message || 'Profile updated successfully');
      setEditing(false);
      setAdminInfo(prev => ({ ...prev, Username: formData.Username }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Update error:', err);
    }
  };

  return (
    <div className="AdminDashboardContainer">
      <div className="AdminDashboardHeader">
        <h1 className="AdminDashboardTitle">Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="AdminDashboardLogoutButton"
        >
          Logout
        </button>
      </div>

      <div className="AdminDashboardProfileSection">
        <div className="AdminDashboardProfileHeader">
          <h2 className="AdminDashboardProfileTitle">Your Profile</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="AdminDashboardEditButton"
            >
              Edit Profile
            </button>
          )}
        </div>

        {adminInfo && !editing && (
          <div className="AdminDashboardProfileInfo">
            <p className="AdminDashboardProfileDetail"><span className="AdminDashboardProfileLabel">Admin ID:</span> {adminInfo.Admin_ID}</p>
            <p className="AdminDashboardProfileDetail"><span className="AdminDashboardProfileLabel">Username:</span> {adminInfo.Username}</p>
              </div>
        )}

        {editing && (
          <form onSubmit={handleUpdateProfile} className="AdminDashboardProfileForm">
            <div className="AdminDashboardFormGroup">
              <label className="AdminDashboardFormLabel">Username</label>
              <input
                type="text"
                name="Username"
                value={formData.Username}
                onChange={handleInputChange}
                className="AdminDashboardFormInput"
                required
              />
            </div>
            <div className="AdminDashboardFormGroup">
              <label className="AdminDashboardFormLabel">New Password (leave blank to keep current)</label>
              <input
                type="password"
                name="Password"
                value={formData.Password}
                onChange={handleInputChange}
                className="AdminDashboardFormInput"
              />
            </div>
            {formData.Password && (
              <div className="AdminDashboardFormGroup">
                <label className="AdminDashboardFormLabel">Confirm Password</label>
                <input
                  type="password"
                  name="ConfirmPassword"
                  value={formData.ConfirmPassword}
                  onChange={handleInputChange}
                  className="AdminDashboardFormInput"
                />
              </div>
            )}
            {error && <p className="AdminDashboardErrorMessage">{error}</p>}
            {success && <p className="AdminDashboardSuccessMessage">{success}</p>}
            <div className="AdminDashboardFormActions">
              <button
                type="submit"
                className="AdminDashboardSaveButton"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError('');
                  setSuccess('');
                  setFormData({
                    Username: adminInfo.Username,
                    Password: '',
                    ConfirmPassword: ''
                  });
                }}
                className="AdminDashboardCancelButton"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="AdminDashboardGrid">
        <AdminDashboardButton 
          onClick={() => navigate('/admin/movies')}
          title="Manage Movies"
          description="Add, edit, or remove movies"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/cinemas')}
          title="Manage Cinemas"
          description="Manage cinema locations"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/users')}
          title="View Users"
          description="See all registered users"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/complaints')}
          title="Manage Complaints"
          description="Handle user complaints"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/screens')}
          title="Manage Screens"
          description="Add or modify screens"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/payments')}
          title="Payment Records"
          description="View payment history"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/screenseattypes')}
          title="Seat & Screen Types"
          description="Configure seating options"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/shows')}
          title="Manage Shows"
          description="Schedule movie showtimes"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/seats')}
          title="Manage Seats"
          description="Configure individual seats"
        />
        <AdminDashboardButton 
          onClick={() => navigate('/admin/bookings')}
          title="Manage Bookings"
          description="View and manage reservations"
        />
      </div>
    </div>
  );
};

const AdminDashboardButton = ({ onClick, title, description }) => (
  <button
    onClick={onClick}
    className="AdminDashboardGridButton"
  >
    <h3 className="AdminDashboardGridButtonTitle">{title}</h3>
    <p className="AdminDashboardGridButtonDescription">{description}</p>
  </button>
);

export default AdminDashboard;