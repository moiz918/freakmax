import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import './AdminScreens.css';

const AdminScreens = () => {
  const [screens, setScreens] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    Cinema_ID: '',
    Screen_Category: 'Regular',
    Total_Seats: 100
  });
  const [editingScreen, setEditingScreen] = useState(null);
  const [filterCinema, setFilterCinema] = useState('');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [screensRes, cinemasRes] = await Promise.all([
        axios.get('http://localhost:5000/api/screens', axiosConfig),
        axios.get('http://localhost:5000/api/cinemas', axiosConfig)
      ]);
      setScreens(screensRes.data.screens || []);
      setCinemas(cinemasRes.data.cinemas || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      showNotification(err.response?.data?.message || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingScreen(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/screens', formData, axiosConfig);
      showNotification('Screen added successfully');
      setFormData({ Cinema_ID: '', Screen_Category: 'Regular', Total_Seats: 100 });
      fetchData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to add screen', 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const totalSeats = parseInt(editingScreen.Total_Seats);
    const seatsAvailable = parseInt(editingScreen.Seats_Available);
    
    if (isNaN(totalSeats)) {
      showNotification('Total seats must be a number', 'error');
      return;
    }
    
    if (isNaN(seatsAvailable)) {
      showNotification('Available seats must be a number', 'error');
      return;
    }
    
    if (seatsAvailable > totalSeats) {
      showNotification('Available seats cannot exceed total seats', 'error');
      return;
    }
    
    try {
      const updateData = {
        Screen_Category: editingScreen.Screen_Category,
        Total_Seats: totalSeats,
        Seats_Available: seatsAvailable
      };
    
      await axios.put(
        `http://localhost:5000/api/screens/${editingScreen.Screen_ID}`,
        updateData,
        axiosConfig
      );
    
      showNotification('Screen updated successfully');
      setEditingScreen(null);
      fetchData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update screen', 'error');
    }
  };

  const handleDelete = async (screenId) => {
    if (!window.confirm('Are you sure you want to delete this screen?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/screens/${screenId}`, axiosConfig);
      showNotification('Screen deleted successfully');
      fetchData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete screen', 'error');
    }
  };

  const filteredScreens = filterCinema 
    ? screens.filter(screen => screen.Cinema_ID.toString() === filterCinema)
    : screens;

  const getCinemaName = (cinemaId) => {
    return cinemas.find(c => c.Cinema_ID === cinemaId)?.Cinema_Name || 'Unknown Cinema';
  };

  if (loading) {
    return (
      <div className="admin-screens-loading">
        <div className="admin-screens-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-screens-container">
      <AdminNavbar />
      <div className="admin-screens-content">
        <h1 className="admin-screens-title">Screen Management</h1>

        {notification.show && (
          <div className={`admin-screens-notification admin-screens-notification-${notification.type}`}>
            {notification.message}
          </div>
        )}

        <div className="admin-screens-grid">
          {/* Add Screen Form */}
          <div className="admin-screens-form">
            <h2 className="admin-screens-subtitle">Add New Screen</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-screens-form-group">
                <label>Cinema</label>
                <select
                  name="Cinema_ID"
                  value={formData.Cinema_ID}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Cinema</option>
                  {cinemas.map(cinema => (
                    <option key={cinema.Cinema_ID} value={cinema.Cinema_ID}>
                      {cinema.Cinema_Name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-screens-form-group">
                <label>Screen Category</label>
                <select
                  name="Screen_Category"
                  value={formData.Screen_Category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Regular">Regular</option>
                  <option value="Premium">Premium</option>
                  <option value="Children">Children</option>
                </select>
              </div>
              <div className="admin-screens-form-group">
                <label>Total Seats</label>
                <input
                  type="number"
                  name="Total_Seats"
                  min="1"
                  value={formData.Total_Seats}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <button type="submit" className="admin-screens-submit-btn">
                Add Screen
              </button>
            </form>
          </div>

          {/* Filter Section */}
          <div className="admin-screens-filter">
            <h2 className="admin-screens-subtitle">Filter Screens</h2>
            <div className="admin-screens-form-group">
              <label>Filter by Cinema</label>
              <select
                value={filterCinema}
                onChange={(e) => setFilterCinema(e.target.value)}
              >
                <option value="">All Cinemas</option>
                {cinemas.map(cinema => (
                  <option key={cinema.Cinema_ID} value={cinema.Cinema_ID}>
                    {cinema.Cinema_Name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Screens Table */}
        <div className="admin-screens-table-container">
          <table className="admin-screens-table">
            <thead>
              <tr>
                <th>Screen ID</th>
                <th>Cinema</th>
                <th>Category</th>
                <th>Total Seats</th>
                <th>Available Seats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScreens.length > 0 ? (
                filteredScreens.map(screen => (
                  <tr key={screen.Screen_ID}>
                    <td>{screen.Screen_ID}</td>
                    <td>{getCinemaName(screen.Cinema_ID)}</td>
                    <td>{screen.Screen_Category}</td>
                    <td>{screen.Total_Seats}</td>
                    <td>{screen.Seats_Available}</td>
                    <td className="admin-screens-actions">
                      <button
                        onClick={() => setEditingScreen({ ...screen })}
                        className="admin-screens-edit-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(screen.Screen_ID)}
                        className="admin-screens-delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="admin-screens-empty">
                    No screens found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {editingScreen && (
          <div className="admin-screens-modal">
            <div className="admin-screens-modal-content">
              <h2 className="admin-screens-subtitle">Edit Screen</h2>
              <form onSubmit={handleUpdate}>
                <div className="admin-screens-form-group">
                  <label>Cinema</label>
                  <select
                    name="Cinema_ID"
                    value={editingScreen.Cinema_ID}
                    onChange={handleEditInputChange}
                    disabled
                  >
                    <option value={editingScreen.Cinema_ID}>
                      {getCinemaName(editingScreen.Cinema_ID)}
                    </option>
                  </select>
                </div>
                <div className="admin-screens-form-group">
                  <label>Screen Category</label>
                  <select
                    name="Screen_Category"
                    value={editingScreen.Screen_Category}
                    onChange={handleEditInputChange}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Premium">Premium</option>
                    <option value="Children">Children</option>
                  </select>
                </div>
                <div className="admin-screens-form-group">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    name="Total_Seats"
                    min="1"
                    value={editingScreen.Total_Seats}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="admin-screens-form-group">
                  <label>Available Seats</label>
                  <input
                    type="number"
                    name="Seats_Available"
                    min="0"
                    value={editingScreen.Seats_Available}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="admin-screens-modal-buttons">
                  <button
                    type="button"
                    onClick={() => setEditingScreen(null)}
                    className="admin-screens-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-screens-save-btn"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminScreens;