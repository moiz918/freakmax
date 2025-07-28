import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import AdminNavbar from '../components/AdminNavbar';
import './AdminBookings.css';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('Pending');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}`},
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/bookings', axiosConfig);
      setBookings(res.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleEditClick = (booking) => {
    setEditingId(booking.Booking_ID);
    setEditStatus(booking.Booking_Status);
  };

  const handleUpdateStatus = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/bookings/${editingId}`,
        { Booking_Status: editStatus },
        axiosConfig
      );
      setSuccess('Booking status updated successfully');
      setEditingId(null);
      setTimeout(() => setSuccess(''), 3000);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update booking status');
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    
    try {
      await axios.delete(
       `http://localhost:5000/api/bookings/${bookingId}`,
        axiosConfig
      );
      setSuccess('Booking deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete booking');
    }
  };

  const statusClasses = {
    Pending: 'AdminBookings-statusPending',
    Complete: 'AdminBookings-statusComplete',
    Cancelled: 'AdminBookings-statusCancelled'
  };

  const formatDateTime = (dateTimeString) => {
    try {
      return format(new Date(dateTimeString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateTimeString;
    }
  };

  return (
    <div className="AdminBookings-container">
      <AdminNavbar />
      <div className="AdminBookings-content">
        <h1 className="AdminBookings-title">Booking Management</h1>
        
        {error && (
          <div className="AdminBookings-alertError">
            {error}
          </div>
        )}
        
        {success && (
          <div className="AdminBookings-alertSuccess">
            {success}
          </div>
        )}

        <div className="AdminBookings-tableContainer">
          <table className="AdminBookings-table">
            <thead className="AdminBookings-tableHead">
              <tr>
                <th className="AdminBookings-tableHeader AdminBookings-tableCellCenter">ID</th>
                <th className="AdminBookings-tableHeader">User</th>
                <th className="AdminBookings-tableHeader">Email</th>
                <th className="AdminBookings-tableHeader">Movie</th>
                <th className="AdminBookings-tableHeader">Cinema</th>
                <th className="AdminBookings-tableHeader AdminBookings-tableCellCenter">Seats</th>
                <th className="AdminBookings-tableHeader AdminBookings-tableCellCenter">Total</th>
                <th className="AdminBookings-tableHeader">Booking Time</th>
                <th className="AdminBookings-tableHeader AdminBookings-tableCellCenter">Status</th>
                <th className="AdminBookings-tableHeader AdminBookings-tableCellCenter">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.Booking_ID} className="AdminBookings-tableRow">
                  <td className="AdminBookings-tableCell AdminBookings-tableCellCenter">{booking.Booking_ID}</td>
                  <td className="AdminBookings-tableCell">{booking.User_Name}</td>
                  <td className="AdminBookings-tableCell">{booking.User_Email}</td>
                  <td className="AdminBookings-tableCell">{booking.Movie_Name}</td>
                  <td className="AdminBookings-tableCell">{booking.Cinema_Name}</td>
                  <td className="AdminBookings-tableCell AdminBookings-tableCellCenter">{booking.Seats_Booked}</td>
                  <td className="AdminBookings-tableCell AdminBookings-tableCellCenter">${booking.Total_Amount}</td>
                  <td className="AdminBookings-tableCell">{formatDateTime(booking.Booking_Time)}</td>
                  <td className="AdminBookings-tableCell AdminBookings-tableCellCenter">
                    {editingId === booking.Booking_ID ? (
                      <select
                        className="AdminBookings-select"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Complete">Complete</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <span className={statusClasses[booking.Booking_Status]}>
                        {booking.Booking_Status}
                      </span>
                    )}
                  </td>
                  <td className="AdminBookings-tableCell AdminBookings-tableCellCenter">
                    {editingId === booking.Booking_ID ? (
                      <>
                        <button
                          onClick={handleUpdateStatus}
                          className="AdminBookings-buttonPrimary"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="AdminBookings-buttonSecondary"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(booking)}
                          className="AdminBookings-buttonWarning"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.Booking_ID)}
                          className="AdminBookings-buttonDanger"
                        >
                          Delete
                        </button>
                      </>
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

export default AdminBookings;