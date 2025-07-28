import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar'; // Adjust path as needed
import  './AdminSeats.css';

const AdminSeats = () => {
  const [seats, setSeats] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    Screen_ID: '',
    Seat_Number: '',
    Aisle: '',
    Seat_Type: 'Gold',
    Availability_Of_Seat: 'Yes'
  });
  const [editingSeat, setEditingSeat] = useState(null);
  const [filterScreen, setFilterScreen] = useState('');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [seatsRes, screensRes] = await Promise.all([
        axios.get('http://localhost:5000/api/seats', axiosConfig),
        axios.get('http://localhost:5000/api/screens', axiosConfig)
      ]);
      setSeats(seatsRes.data.seats || []);
      setScreens(screensRes.data.screens || []);
    } catch (err) {
      console.error('Fetch error:', err);
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
    setEditingSeat(prev => ({ ...prev, [name]: value }));
  };


  console.log("Submitting seat:", formData);


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate inputs
      if (!/^[A-Z]$/.test(formData.Aisle)) {
        throw new Error('Aisle must be a single uppercase letter (A-Z)');
      }
      
      const seatNumber = parseInt(formData.Seat_Number, 10);
      if (isNaN(seatNumber)) {
        throw new Error('Seat Number must be a valid number');
      }
      
      const screenId = parseInt(formData.Screen_ID, 10);
      if (isNaN(screenId)) {
        throw new Error('Invalid Screen ID');
      }
  
      const seatData = {
        Screen_ID: screenId,
        Seat_Number: seatNumber,
        Aisle: formData.Aisle.toUpperCase(),
        Seat_Type: formData.Seat_Type,
        Availability_Of_Seat: formData.Availability_Of_Seat
      };
  
      const response = await axios.post(
        'http://localhost:5000/api/seats',
        seatData,
        axiosConfig // Use the config you defined
      );
  
      if (response.data.success) {
        showNotification('Seat added successfully');
        setFormData({ 
          Screen_ID: '', 
          Seat_Number: '', 
          Aisle: '', 
          Seat_Type: 'Regular', 
          Availability_Of_Seat: 'Yes' 
        });
        await fetchData();
      } else {
        throw new Error(response.data.message || 'Failed to add seat');
      }
    } catch (err) {
      console.error('Error adding seat:', err);
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Failed to add seat';
      showNotification(errorMessage, 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { Screen_ID, Seat_Number, Aisle } = editingSeat;
      const response = await axios.put(
        `http://localhost:5000/api/seats/${Screen_ID}/${Seat_Number}/${Aisle}`,
       // editingSeat,
        axiosConfig
      );
      showNotification('Seat updated successfully');
      setEditingSeat(null);
      await fetchData();
    } catch (err) {
      console.error('Update error:', err);
      showNotification(err.response?.data?.message || 'Failed to update seat', 'error');
    }
  };

  const handleDelete = async (screenId, seatNumber, aisle) => {
    if (!window.confirm('Are you sure you want to delete this seat?')) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/seats/${screenId}/${seatNumber}/${aisle}`,
        axiosConfig
      );
      showNotification('Seat deleted successfully');
      await fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      showNotification(err.response?.data?.message || 'Failed to delete seat', 'error');
    }
  };

  const filteredSeats = filterScreen
    ? seats.filter(seat => seat.Screen_ID.toString() === filterScreen)
    : seats;

  const getScreenName = (screenId) => {
    const screen = screens.find(s => s.Screen_ID === screenId);
    return screen ? `Screen ${screen.Screen_ID} (${screen.Screen_Category})` : 'Unknown Screen';
  };

  if (loading) {
    return (
      <div className="admin-seats-loading">
        <div className="admin-seats-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-seats-container">
      <AdminNavbar />
      <div className="admin-seats-content">
        <h1 className="admin-seats-title">Seat Management</h1>

        {notification.show && (
          <div className={`admin-seats-notification admin-seats-notification-${notification.type}`}>
            {notification.message}
          </div>
        )}

        <div className="admin-seats-grid">
          {/* Add Seat Form */}
          <div className="admin-seats-form">
            <h2 className="admin-seats-subtitle">Add New Seat</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-seats-form-group">
                <label>Screen</label>
                <select
                  name="Screen_ID"
                  value={formData.Screen_ID}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Screen</option>
                  {screens.map(screen => (
                    <option key={screen.Screen_ID} value={screen.Screen_ID}>
                      {getScreenName(screen.Screen_ID)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-seats-form-group">
                <label>Seat Number</label>
                <input
                  type="number"
                  name="Seat_Number"
                  min="1"
                  value={formData.Seat_Number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="admin-seats-form-group">
                <label>Aisle (A-Z)</label>
                <input
                  type="text"
                  name="Aisle"
                  maxLength="1"
                  value={formData.Aisle}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (/^[A-Z]?$/.test(value)) {
                      handleInputChange({ target: { name: 'Aisle', value } });
                    }
                  }}
                  required
                />
              </div>
              <div className="admin-seats-form-group">
                <label>Seat Type</label>
                <select
                  name="Seat_Type"
                  value={formData.Seat_Type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>
              <div className="admin-seats-form-group">
                <label>Availability</label>
                <select
                  name="Availability_Of_Seat"
                  value={formData.Availability_Of_Seat}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <button type="submit" className="admin-seats-submit-btn">
                Add Seat
              </button>
            </form>
          </div>

          {/* Filter Section */}
          <div className="admin-seats-filter">
            <h2 className="admin-seats-subtitle">Filter Seats</h2>
            <div className="admin-seats-form-group">
              <label>Filter by Screen</label>
              <select
                value={filterScreen}
                onChange={(e) => setFilterScreen(e.target.value)}
              >
                <option value="">All Screens</option>
                {screens.map(screen => (
                  <option key={screen.Screen_ID} value={screen.Screen_ID}>
                    {getScreenName(screen.Screen_ID)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="admin-seats-table-container">
          <table className="admin-seats-table">
            <thead>
              <tr>
                <th>Screen</th>
                <th>Seat Number</th>
                <th>Aisle</th>
                <th>Type</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeats.length > 0 ? (
                filteredSeats.map(seat => (
                  <tr key={`${seat.Screen_ID}-${seat.Seat_Number}-${seat.Aisle}`}>
                    <td>{getScreenName(seat.Screen_ID)}</td>
                    <td>{seat.Seat_Number}</td>
                    <td>{seat.Aisle}</td>
                    <td>{seat.Seat_Type}</td>
                    <td className={`admin-seats-availability admin-seats-availability-${seat.Availability_Of_Seat === 'Yes' ? 'available' : 'unavailable'}`}>
                      {seat.Availability_Of_Seat}
                    </td>
                    <td className="admin-seats-actions">
                      <button 
                        onClick={() => setEditingSeat({ ...seat })} 
                        className="admin-seats-edit-btn"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(seat.Screen_ID, seat.Seat_Number, seat.Aisle)} 
                        className="admin-seats-delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="admin-seats-empty">No seats found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {editingSeat && (
          <div className="admin-seats-modal">
            <div className="admin-seats-modal-content">
              <h2 className="admin-seats-subtitle">Edit Seat</h2>
              <form onSubmit={handleUpdate}>
                <div className="admin-seats-form-group">
                  <label>Seat Type</label>
                  <select
                    name="Seat_Type"
                    value={editingSeat.Seat_Type}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
                <div className="admin-seats-form-group">
                  <label>Availability</label>
                  <select
                    name="Availability_Of_Seat"
                    value={editingSeat.Availability_Of_Seat}
                    onChange={handleEditInputChange}
                    required
                  >
                    <option value="Yes">Available</option>
                    <option value="No">Unavailable</option>
                  </select>
                </div>
                <div className="admin-seats-modal-buttons">
                  <button 
                    type="button" 
                    onClick={() => setEditingSeat(null)} 
                    className="admin-seats-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="admin-seats-save-btn"
                  >
                    Update
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

export default AdminSeats;