import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import './AdminScreenSeatTypes.css';

const AdminScreenSeatTypes = () => {
  const [screenCategories, setScreenCategories] = useState([]);
  const [seatTypes, setSeatTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editScreen, setEditScreen] = useState(null);
  const [editSeat, setEditSeat] = useState(null);
  const [updatedValue, setUpdatedValue] = useState({ category: '', price: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        const [categoriesResponse, seatsResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/screen-categories', {
            headers: { Authorization: `Bearer ${token}`}
          }),
          axios.get('http://localhost:5000/api/seat-types', {
            headers: { Authorization: `Bearer ${token}`}
          })
        ]);

        setScreenCategories(categoriesResponse.data?.data || []);
        setSeatTypes(seatsResponse.data?.seatTypes || []);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = (item, type) => {
    if (type === 'screen') {
      setEditScreen(item.Screen_Category);
      setUpdatedValue({ category: item.Screen_Category, price: item.Screen_Price });
    } else {
      setEditSeat(item.Seat_Type);
      setUpdatedValue({ category: item.Seat_Type, price: item.Seat_Price });
    }
  };

  const handleSave = async (type) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (type === 'screen') {
        await axios.put(
          `http://localhost:5000/api/screen-categories/${editScreen}`,
          { Screen_Price: updatedValue.price },
          { headers: { Authorization: `Bearer ${token}`} }
        );
        setScreenCategories(prev =>
          prev.map(item =>
            item.Screen_Category === editScreen
              ? { ...item, Screen_Price: updatedValue.price }
              : item
          )
        );
        setEditScreen(null);
      } else {
        await axios.put(
          `http://localhost:5000/api/seat-types/${editSeat}`,
          { Seat_Price: updatedValue.price },
          { headers: { Authorization: `Bearer ${token}`} }
        );
        setSeatTypes(prev =>
          prev.map(item =>
            item.Seat_Type === editSeat
              ? { ...item, Seat_Price: updatedValue.price }
              : item
          )
        );
        setEditSeat(null);
      }
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancel = () => {
    setEditScreen(null);
    setEditSeat(null);
  };

  if (loading) return <div className="AdminScreenSeatTypes">Loading data...</div>;
  if (error) return <div className="AdminScreenSeatTypes">Error: {error}</div>;

  return (
    <div className="AdminScreenSeatTypes">
      <AdminNavbar/>
      <div>
        <h1 className="AdminScreenSeatTypes-title">Screen & Seat Management</h1>

        <div className="AdminScreenSeatTypes-section">
          <h2 className="AdminScreenSeatTypes-sectionTitle">Screen Categories</h2>
          <table className="AdminScreenSeatTypes-table">
            <thead>
              <tr>
                <th className="AdminScreenSeatTypes-tableHeader">Category</th>
                <th className="AdminScreenSeatTypes-tableHeader">Price</th>
                <th className="AdminScreenSeatTypes-tableHeader">Action</th>
              </tr>
            </thead>
            <tbody>
              {screenCategories.map((category) => (
                <tr key={category.Screen_Category}>
                  <td className="AdminScreenSeatTypes-tableCell">
                    {editScreen === category.Screen_Category ? (
                      <input
                        type="text"
                        className="AdminScreenSeatTypes-input"
                        value={updatedValue.category}
                        onChange={(e) => setUpdatedValue({ ...updatedValue, category: e.target.value })}
                        disabled
                      />
                    ) : (
                      category.Screen_Category
                    )}
                  </td>
                  <td className="AdminScreenSeatTypes-tableCell">
                    {editScreen === category.Screen_Category ? (
                      <input
                        type="number"
                        className="AdminScreenSeatTypes-input"
                        value={updatedValue.price}
                        onChange={(e) => setUpdatedValue({ ...updatedValue, price: e.target.value })}
                      />
                    ) : (
                      <span className="AdminScreenSeatTypes-price">₨{category.Screen_Price}</span>
                    )}
                  </td>
                  <td className="AdminScreenSeatTypes-tableCell">
                    {editScreen === category.Screen_Category ? (
                      <>
                        <button 
                          className="AdminScreenSeatTypes-button AdminScreenSeatTypes-saveButton"
                          onClick={() => handleSave('screen')}
                        >
                          Save
                        </button>
                        <button 
                          className="AdminScreenSeatTypes-button AdminScreenSeatTypes-cancelButton"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        className="AdminScreenSeatTypes-button AdminScreenSeatTypes-editButton"
                        onClick={() => handleEdit(category, 'screen')}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="AdminScreenSeatTypes-section">
          <h2 className="AdminScreenSeatTypes-sectionTitle">Seat Types</h2>
          <table className="AdminScreenSeatTypes-table">
            <thead>
              <tr>
                <th className="AdminScreenSeatTypes-tableHeader">Type</th>
                <th className="AdminScreenSeatTypes-tableHeader">Price</th>
                <th className="AdminScreenSeatTypes-tableHeader">Action</th>
              </tr>
            </thead>
            <tbody>
              {seatTypes.map((seat) => (
                <tr key={seat.Seat_Type}>
                  <td className="AdminScreenSeatTypes-tableCell">
                    {editSeat === seat.Seat_Type ? (
                      <input
                        type="text"
                        className="AdminScreenSeatTypes-input"
                        value={updatedValue.category}
                        onChange={(e) => setUpdatedValue({ ...updatedValue, category: e.target.value })}
                        disabled
                      />
                    ) : (
                      seat.Seat_Type
                    )}
                  </td>
                  <td className="AdminScreenSeatTypes-tableCell">
                    {editSeat === seat.Seat_Type ? (
                      <input
                        type="number"
                        className="AdminScreenSeatTypes-input"
                        value={updatedValue.price}
                        onChange={(e) => setUpdatedValue({ ...updatedValue, price: e.target.value })}
                      />
                    ) : (
                      <span className="AdminScreenSeatTypes-price">₨{seat.Seat_Price}</span>
                    )}
                  </td>
                  <td className="AdminScreenSeatTypes-tableCell">
                    {editSeat === seat.Seat_Type ? (
                      <>
                        <button 
                          className="AdminScreenSeatTypes-button AdminScreenSeatTypes-saveButton"
                          onClick={() => handleSave('seat')}
                        >
                          Save
                        </button>
                        <button 
                          className="AdminScreenSeatTypes-button AdminScreenSeatTypes-cancelButton"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        className="AdminScreenSeatTypes-button AdminScreenSeatTypes-editButton"
                        onClick={() => handleEdit(seat, 'seat')}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminScreenSeatTypes;