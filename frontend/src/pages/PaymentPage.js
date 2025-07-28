import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PaymentPage.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [originalAmount, setOriginalAmount] = useState(0);
  const [discountedAmount, setDiscountedAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const token = localStorage.getItem('token');

  const { 
    bookingId,
    movieName,
    cinemaName, 
    showTime,
    screenNumber,
    selectedSeats
  } = location.state || {};

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    if (!token) navigate('/login');
    if (!bookingId) navigate('/bookings');

    const fetchData = async () => {
      try {
        const amountResponse = await axios.get(
          `http://localhost:5000/api/bookings/${bookingId}/amount`,
          { headers: { Authorization: `Bearer ${token}`} }
        );
        
        if (amountResponse.data.success) {
          setOriginalAmount(amountResponse.data.total);
          setDiscountedAmount(amountResponse.data.total);
        }

        const discountsResponse = await axios.get(
          'http://localhost:5000/api/customer-discounts/my-discounts',
          { headers: { Authorization: `Bearer ${token}`} }
        );
    
        if (discountsResponse.data.success) {
          setDiscounts(discountsResponse.data.myDiscounts || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load payment information');
      }
    };

    fetchData();
  }, [bookingId, navigate, token]);

  useEffect(() => {
    if (selectedDiscount && originalAmount > 0) {
      const newAmount = Math.max(originalAmount - selectedDiscount.Points, 0);
      setDiscountedAmount(newAmount);
    } else {
      setDiscountedAmount(originalAmount);
    }
  }, [selectedDiscount, originalAmount]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!paymentMethod) {
      setError('Please select a payment method');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/payments',
        {
          Booking_ID: bookingId,
          Payment_Method: paymentMethod,
          Amount: discountedAmount
        },
        { headers: { Authorization: `Bearer ${token}`} }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/booking-confirmation', {
            state: {
              paymentId: response.data.paymentId,
              amount: discountedAmount,
              bookingId,
              movieName,
              showTime,
              seats: selectedSeats,
              discountUsed: selectedDiscount ? selectedDiscount.Points : null
            }
          });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="PaymentPage">
        <p>No booking information found</p>
        <button 
          onClick={() => navigate('/')}
          className="PaymentPage-submitBtn"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="PaymentPage">
      <nav className="PaymentPage-nav">
        <button 
          onClick={() => navigate(-1)}
          className="PaymentPage-backBtn"
        >
          Back
        </button>
        <div className="PaymentPage-logo">Freakmax Cinema</div>
        <div className="PaymentPage-navLinks">
          <Link to="/home" className="PaymentPage-navLink">Home</Link>
          <Link to="/profile" className="PaymentPage-navLink">Profile</Link>
          {token ? (
            <button onClick={handleLogout} className="PaymentPage-logoutBtn">
              Logout
            </button>
          ) : (
            <Link to="/login" className="PaymentPage-logoutBtn">Login</Link>
          )}
        </div>
      </nav>

      <div className="PaymentPage-container">
        <h1 className="PaymentPage-title">Complete Payment</h1>
        
        <div className="PaymentPage-card">
          <h2 className="PaymentPage-cardTitle">Booking Details</h2>
          <div className="PaymentPage-grid">
            <p><span className="PaymentPage-label">Movie:</span> <span className="PaymentPage-value">{movieName}</span></p>
            <p><span className="PaymentPage-label">Cinema:</span> <span className="PaymentPage-value">{cinemaName}</span></p>
            <p><span className="PaymentPage-label">Show Time:</span> <span className="PaymentPage-value">{new Date(showTime).toLocaleString()}</span></p>
            <p><span className="PaymentPage-label">Screen:</span> <span className="PaymentPage-value">{screenNumber}</span></p>
            <p><span className="PaymentPage-label">Seats:</span> <span className="PaymentPage-value">{selectedSeats?.join(', ')}</span></p>
            <p><span className="PaymentPage-label">Booking ID:</span> <span className="PaymentPage-value">{bookingId}</span></p>
          </div>
        </div>

        {discounts.length > 0 && (
          <div className="PaymentPage-card">
            <h2 className="PaymentPage-cardTitle">Available Discounts</h2>
            <select
              onChange={(e) => {
                const discount = discounts.find(d => d.Discount_ID == e.target.value);
                setSelectedDiscount(discount || null);
              }}
              className="PaymentPage-select"
            >
              <option value="">No discount</option>
              {discounts.map(discount => (
                <option key={discount.Discount_ID} value={discount.Discount_ID}>
                  Rs. {discount.Points} off
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="PaymentPage-card">
          <h2 className="PaymentPage-cardTitle">Payment Summary</h2>
          <p><span className="PaymentPage-label">Original Amount:</span> <span className="PaymentPage-value">Rs. {originalAmount.toFixed(2)}</span></p>
          {selectedDiscount && (
            <p><span className="PaymentPage-label">Discount:</span> <span className="PaymentPage-value">- Rs. {selectedDiscount.Points.toFixed(2)}</span></p>
          )}
          <p><span className="PaymentPage-label">Total to Pay:</span> <span className="PaymentPage-value">Rs. {discountedAmount.toFixed(2)}</span></p>
        </div>

        <form onSubmit={handlePayment} className="PaymentPage-card">
          <h2 className="PaymentPage-cardTitle">Payment Method</h2>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="PaymentPage-select"
            required
          >
            <option value="">Select payment method</option>
            <option value="Bank Card">Bank Card</option>
            <option value="JazzCash">Jazz Cash</option>
            <option value="EasyPaisa">Easy Paisa</option>
            <option value="QR">QR</option>
          </select>

          {error && <div className="PaymentPage-error">{error}</div>}
          {success && <div className="PaymentPage-success">Payment successful!</div>}

          <div className="PaymentPage-buttonGroup">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="PaymentPage-button PaymentPage-cancelBtn"
            >
              Back
            </button>
            <button
              type="submit"
              className="PaymentPage-button PaymentPage-submitBtn"
              disabled={loading || success}
            >
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentPage;