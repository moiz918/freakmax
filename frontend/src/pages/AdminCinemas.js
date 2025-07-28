import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import './AdminCinemas.css';

const AdminCinemas = () => {
  const [cinemas, setCinemas] = useState([]);
  const [newCinema, setNewCinema] = useState({
    Cinema_Name: '',
    Cinema_Location: '',
    Cinema_Number: '',
    Cinema_Email: '',
    Total_Screens: ''
  });
  const [editCinema, setEditCinema] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}`},
  };

  const fetchCinemas = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/cinemas', axiosConfig);
      setCinemas(res.data.cinemas || []);
    } catch {
      setError('Failed to fetch cinemas');
    }
  };

  useEffect(() => {
    fetchCinemas();
  }, []);

  const handleAddCinema = async () => {
    try {
      await axios.post('http://localhost:5000/api/cinemas', newCinema, axiosConfig);
      setNewCinema({ 
        Cinema_Name: '', 
        Cinema_Location: '',
        Cinema_Number: '',
        Cinema_Email: '',
        Total_Screens: ''
      });
      setSuccess('Cinema added successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchCinemas();
    } catch {
      setError('Failed to add cinema');
    }
  };

  const handleUpdateCinema = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/cinemas/${editCinema.Cinema_ID}`, 
        {
          Cinema_Name: editCinema.Cinema_Name,
          Cinema_Location: editCinema.Cinema_Location,
          Cinema_Number: editCinema.Cinema_Number,
          Cinema_Email: editCinema.Cinema_Email,
          Total_Screens: editCinema.Total_Screens
        },
        axiosConfig
      );
      setEditCinema(null);
      setSuccess('Cinema updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchCinemas();
    } catch {
      setError('Failed to update cinema');
    }
  };

  const handleDeleteCinema = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cinema?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/cinemas/${id}`, axiosConfig);
      setSuccess('Cinema deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchCinemas();
    } catch {
      setError('Failed to delete cinema');
    }
  };

  return (
    <div className="AdminCinemasContainer">
      <AdminNavbar />
      <div className="AdminCinemasContent">
        <h1 className="AdminCinemasTitle">Cinema Management</h1>
        
        {error && <div className="AdminCinemasErrorMessage">{error}</div>}
        {success && <div className="AdminCinemasSuccessMessage">{success}</div>}

        <div className="AdminCinemasList">
          {cinemas.map((cinema) => (
            <div key={cinema.Cinema_ID} className="AdminCinemasCard">
              {editCinema?.Cinema_ID === cinema.Cinema_ID ? (
                <div className="AdminCinemasEditForm">
                  <div className="AdminCinemasFormGroup">
                    <label className="AdminCinemasFormLabel">Cinema Name:</label>
                    <input 
                      type="text" 
                      value={editCinema.Cinema_Name} 
                      onChange={(e) => setEditCinema({ ...editCinema, Cinema_Name: e.target.value })}
                      className="AdminCinemasFormInput"
                    />
                  </div>
                  <div className="AdminCinemasFormGroup">
                    <label className="AdminCinemasFormLabel">Location:</label>
                    <input 
                      type="text" 
                      value={editCinema.Cinema_Location} 
                      onChange={(e) => setEditCinema({ ...editCinema, Cinema_Location: e.target.value })}
                      className="AdminCinemasFormInput"
                    />
                  </div>
                  <div className="AdminCinemasFormGroup">
                    <label className="AdminCinemasFormLabel">Phone:</label>
                    <input 
                      type="text" 
                      value={editCinema.Cinema_Number} 
                      onChange={(e) => setEditCinema({ ...editCinema, Cinema_Number: e.target.value })}
                      className="AdminCinemasFormInput"
                    />
                  </div>
                  <div className="AdminCinemasFormGroup">
                    <label className="AdminCinemasFormLabel">Email:</label>
                    <input 
                      type="email" 
                      value={editCinema.Cinema_Email} 
                      onChange={(e) => setEditCinema({ ...editCinema, Cinema_Email: e.target.value })}
                      className="AdminCinemasFormInput"
                    />
                  </div>
                  <div className="AdminCinemasFormGroup">
                    <label className="AdminCinemasFormLabel">Total Screens:</label>
                    <input 
                      type="number" 
                      value={editCinema.Total_Screens} 
                      onChange={(e) => setEditCinema({ ...editCinema, Total_Screens: e.target.value })}
                      className="AdminCinemasFormInput"
                    />
                  </div>
                  <div className="AdminCinemasFormActions">
                    <button onClick={handleUpdateCinema} className="AdminCinemasSaveButton">
                      Save
                    </button>
                    <button onClick={() => setEditCinema(null)} className="AdminCinemasCancelButton">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="AdminCinemasCardHeader">
                    <h3 className="AdminCinemasCardTitle">{cinema.Cinema_Name}</h3>
                    <div className="AdminCinemasCardActions">
                      <button 
                        onClick={() => setEditCinema(cinema)}
                        className="AdminCinemasEditButton"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCinema(cinema.Cinema_ID)}
                        className="AdminCinemasDeleteButton"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="AdminCinemasCardDetails">
                    <p className="AdminCinemasCardDetail"><span className="AdminCinemasCardLabel">Location:</span> {cinema.Cinema_Location}</p>
                    <p className="AdminCinemasCardDetail"><span className="AdminCinemasCardLabel">Phone:</span> {cinema.Cinema_Number}</p>
                    <p className="AdminCinemasCardDetail"><span className="AdminCinemasCardLabel">Email:</span> {cinema.Cinema_Email}</p>
                    <p className="AdminCinemasCardDetail"><span className="AdminCinemasCardLabel">Total Screens:</span> {cinema.Total_Screens}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="AdminCinemasAddForm">
          <h2 className="AdminCinemasAddTitle">Add New Cinema</h2>
          <div className="AdminCinemasFormGroup">
            <label className="AdminCinemasFormLabel">Cinema Name:</label>
            <input 
              type="text" 
              value={newCinema.Cinema_Name} 
              onChange={(e) => setNewCinema({ ...newCinema, Cinema_Name: e.target.value })}
              className="AdminCinemasFormInput"
            />
          </div>
          <div className="AdminCinemasFormGroup">
            <label className="AdminCinemasFormLabel">Location:</label>
            <input 
              type="text" 
              value={newCinema.Cinema_Location} 
              onChange={(e) => setNewCinema({ ...newCinema, Cinema_Location: e.target.value })}
              className="AdminCinemasFormInput"
            />
          </div>
          <div className="AdminCinemasFormGroup">
            <label className="AdminCinemasFormLabel">Phone Number:</label>
            <input 
              type="text" 
              value={newCinema.Cinema_Number} 
              onChange={(e) => setNewCinema({ ...newCinema, Cinema_Number: e.target.value })}
              className="AdminCinemasFormInput"
            />
          </div>
          <div className="AdminCinemasFormGroup">
            <label className="AdminCinemasFormLabel">Email:</label>
            <input 
              type="email" 
              value={newCinema.Cinema_Email} 
              onChange={(e) => setNewCinema({ ...newCinema, Cinema_Email: e.target.value })}
              className="AdminCinemasFormInput"
            />
          </div>
          <div className="AdminCinemasFormGroup">
            <label className="AdminCinemasFormLabel">Total Screens:</label>
            <input 
              type="number" 
              value={newCinema.Total_Screens} 
              onChange={(e) => setNewCinema({ ...newCinema, Total_Screens: e.target.value })}
              className="AdminCinemasFormInput"
            />
          </div>
          <button onClick={handleAddCinema} className="AdminCinemasAddButton">
            Add Cinema
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCinemas;