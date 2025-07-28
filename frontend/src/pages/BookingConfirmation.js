import React from 'react';
import { Link,useLocation, useNavigate } from 'react-router-dom';
import './BookingConfirmation.css';

const BookingConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const {
    paymentId,
    amount,
    bookingId,
    movieName,
    showTime,
    seats
  } = location.state || {};

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };


  const formatShowTime = (timeString) => {
    try {
      if (!timeString) return "Time not available";
      
      const time = new Date(timeString);
      if (isNaN(time.getTime())) return "Time not available";

      return time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "Time not available";
    }
  };

  const handleViewBookings = () => {
    navigate('/my-bookings');
  };

  if (!paymentId) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">No Booking Confirmation Found</h2>
        <p className="mb-4">It seems you arrived here directly without completing a payment.</p>
        <button
          onClick={handleBackToHome}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (


<div className="booking-confirmation-container">
  <nav className="booking-confirmation-nav">
 {/* Navigation Bar */}
 <div className="profile-navigation" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 25px',
        backgroundColor: '#2c3e50',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '30px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🎬</span>
          <span style={{ fontWeight: 'bold', color: '#e74c3c' }}>Freakmax</span>
        </div>
        
        <div className="nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link 
            to="/home" 
            style={{ 
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '8px 15px',
              borderRadius: '4px',
              backgroundColor: '#3498db',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          
    <Link 
            to="/user/shows" 
            style={{ 
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '8px 15px',
              borderRadius: '4px',
              backgroundColor: '#3498db',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-shows"></i>
            <span>Shows</span>
          </Link>

          <Link 
            to="/profile" 
            style={{ 
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600',
              padding: '8px 15px',
              borderRadius: '4px',
              backgroundColor: '#3498db',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </Link>
          
          {token ? (
            <button 
              onClick={handleLogout}
              style={{
                color: 'white',
                textDecoration: 'none',
                fontWeight: '600',
                padding: '8px 15px',
                borderRadius: '4px',
                backgroundColor: '#e74c3c',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          ) : (
            <Link 
              to="/login" 
              style={{ 
                color: 'white',
                textDecoration: 'none',
                fontWeight: '600',
                padding: '8px 15px',
                borderRadius: '4px',
                backgroundColor: '#2ecc71',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
  
</nav>

<div className="success-header">
{/* Success Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <svg 
            className="h-16 w-16 text-green-500" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">Payment Successful!</h1>
        <p className="text-lg text-gray-600">Your booking has been confirmed</p>
     
     
      </div>

</div>



<div className="booking-card">
<h2 className="booking-card-header">Booking Details</h2>
      {/* Booking Summary Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 mb-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">Booking Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600 font-medium">Payment ID</p>
              <p className="text-lg">{paymentId}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Booking ID</p>
              <p className="text-lg">{bookingId}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Movie</p>
              <p className="text-lg">{movieName}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Show Time</p>
              <p className="text-lg">{formatShowTime(showTime)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Seats Booked</p>
              <p className="text-lg">{seats.join(', ')}</p>
            </div>
            <div>
              <p className="text-gray-600 font-medium">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">Rs. {amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
      
      </div>


      {/* Next Steps */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">What's Next?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your booking confirmation has been sent to your registered email</li>
          <li>Please arrive at least 30 minutes before the showtime</li>
          <li>Bring this confirmation or your ID for verification</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={handleBackToHome}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
        <button
          onClick={handleViewBookings}
          className="bg-white text-blue-600 px-6 py-3 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors"
        >
          View My Bookings
        </button>
      </div>

      {/* Print Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => window.print()}
          className="text-gray-600 hover:text-gray-800 underline flex items-center justify-center mx-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Confirmation
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmation;