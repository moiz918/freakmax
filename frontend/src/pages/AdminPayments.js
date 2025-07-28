import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import './AdminPayments.css';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/payments', axiosConfig);
      setPayments(res.data.payments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatShowTime = (dateString, timeString) => {
    if (!dateString || !timeString) return 'Invalid Date/Time';

    try {
      const date = new Date(dateString);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const [hours, minutes] = timeString.split(':');
      const startTime = new Date();
      startTime.setHours(parseInt(hours), parseInt(minutes));

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      const formattedStartTime = startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const formattedEndTime = endTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return `${formattedDate}, ${formattedStartTime}-${formattedEndTime}`;
    } catch {
      return `${dateString}, ${timeString}`;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PKR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="admin-payments-loading">
        <div className="admin-payments-spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-payments-dark-container">
      <AdminNavbar />
      <div className="admin-payments-dark-content">
        <h2 className="admin-payments-dark-title">Payment Records</h2>
  
        {error && (
          <div className="admin-payments-dark-error">
            {error}
          </div>
        )}
  
        <div className="admin-payments-dark-table-container">
          <table className="admin-payments-dark-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>User</th>
                <th>Movie</th>
                <th>Cinema</th>
                <th>Show Time</th>
                <th className="admin-payments-dark-amount">Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.Payment_ID}>
                  <td>{payment.Payment_ID}</td>
                  <td>
                    <div className="admin-payments-dark-user-name">{payment.User_Name}</div>
                    <div className="admin-payments-dark-user-email">{payment.User_Email}</div>
                  </td>
                  <td>{payment.Movie_Name}</td>
                  <td>{payment.Cinema_Name}</td>
                  <td>
                    {formatShowTime(payment.Show_Date, payment.Show_Time)}
                  </td>
                  <td className="admin-payments-dark-amount">
                    {formatCurrency(payment.Amount)}
                  </td>
                  <td>{payment.Payment_Method}</td>
                  <td>
                    <span className={`admin-payments-dark-status admin-payments-dark-status-${payment.Payment_Status.toLowerCase()}`}>
                      {payment.Payment_Status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
  
        {payments.length === 0 && !error && (
          <div className="admin-payments-dark-empty">
            No payment records found
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayments;