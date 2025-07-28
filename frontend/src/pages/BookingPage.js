import React, { useEffect, useState } from 'react';
import { Link,useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './BookingPage.css'

const BookingPage = () => {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [selectionStep, setSelectionStep] = useState(1);
  const token = localStorage.getItem('token');

  const {
    movieName,
    cinemaName,
    showTime,
    screenNumber,
    cinemaId,
    screenId,
    showDate,
  } = location.state || {};

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchSeats = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(
          `http://localhost:5000/api/shows/${showId}/seats`,
          config
        );
        if (!response.data.success)
          throw new Error(response.data.message || 'Failed to fetch seats');
        setSeats(response.data.seats);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, [showId, navigate, token]);

  const handleSeatSelection = (seatNumber) => {
    setSelectedSeats((prev) => {
      const updated = new Set(prev);
      updated.has(seatNumber) ? updated.delete(seatNumber) : updated.add(seatNumber);
      return updated;
    });
  };

  const checkSeatExists = async (seatNumber) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(
        'http://localhost:5000/api/seats/check-seat',
        {
          Screen_ID: screenId,
          Seat_Number: seatNumber,
          Aisle: 'A',
        },
        config
      );
      return response.data.exists;
    } catch (err) {
      console.error('Error checking seat:', err);
      return false;
    }
  };

  const addSeatIfNotExists = async (seatNumber) => {
    try {
      // First check if the seat already exists
     
      // If seat doesn't exist, proceed to add it
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(
        'http://localhost:5000/api/seats',
        {
          Screen_ID: screenId,
          Seat_Number: seatNumber,
          Aisle: 'A',
          Seat_Type: 'Gold',
          Availability_Of_Seat: 'Yes',
        },
        config
      );
      return response.data.success;
    } catch (err) {
      // Handle any unexpected errors
      console.error('Error in addSeatIfNotExists:', err);
      return false;
    }
  };

  const bookSeats = async (bookingId) => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const results = await Promise.all(
      [...selectedSeats].map(async (seatNumber) => {
        try {
          const seat = seats.find((s) => s.seatNumber === seatNumber);
          const response = await axios.post(
            'http://localhost:5000/api/seats-booking',
            {
              Screen_ID: screenId,
              Seat_Number: seatNumber,
              Aisle: seat?.Aisle || 'A',
              Booking_ID: bookingId,
            },
            config
          );
          return response.data.success;
        } catch (err) {
          console.error(`Failed to book seat ${seatNumber}:`, err);
          return false;
        }
      })
    );
    return results.every((result) => result);
  };

  const handleConfirmBooking = async () => {
    try {
      setLoading(true);
      setError('');

      if (!cinemaId || !showId || !screenId) {
        throw new Error('Required information is missing');
      }

      const seatCreationResults = await Promise.all(
        [...selectedSeats].map((seatNumber) => addSeatIfNotExists(seatNumber))
      );
      if (seatCreationResults.some((success) => !success)) {
        throw new Error('Failed to verify seats');
      }

      const bookingResponse = await axios.post(
        'http://localhost:5000/api/bookings',
        {
          Cinema_ID: cinemaId,
          Show_ID: showId,
          Screen_ID: screenId,
          seatIds: seats
            .filter((seat) => selectedSeats.has(seat.seatNumber))
            .map((seat) => seat.Seat_ID),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!bookingResponse.data.success) {
        throw new Error(bookingResponse.data.message || 'Booking failed');
      }

      const allSeatsBooked = await bookSeats(bookingResponse.data.bookingId);

      navigate('/checkout', {
        state: {
          bookingId: bookingResponse.data.bookingId,
          bookingTime: bookingResponse.data.bookingTime,
          movieName,
          cinemaName,
          showTime,
          screenNumber: screenNumber || `Screen ${screenId}`,
          selectedSeats: [...selectedSeats],
          allSeatsBooked,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="showspage-text-center showspage-p-8">Loading...</div>;


  
  return (
    <div className="BookingPage-container">
      <div className="BookingPage-navigation">
        <div className="BookingPage-navContainer">
          <Link to="/home" className="BookingPage-logo">🎬 Freakmax</Link>
          <div className="BookingPage-navLinks">
            <Link to="/home" className="BookingPage-navLink">Home</Link>
            <Link to="/user/shows" className="BookingPage-navLink">Shows</Link>
            <Link to="/profile" className="BookingPage-navLink">Profile</Link>
            {token ? (
              <button onClick={handleLogout} className="BookingPage-logoutBtn">Logout</button>
            ) : (
              <Link to="/login" className="BookingPage-logoutBtn">Login</Link>
            )}
          </div>
        </div>
      </div>

      <div className="BookingPage-content">
        <h1 className="BookingPage-title">Book Your Seats</h1>
        {error && <div className="BookingPage-error">{error}</div>}

        <div className="BookingPage-showInfo">
          <p className="BookingPage-infoItem">
            <span className="BookingPage-infoLabel">Movie:</span>
            <span className="BookingPage-infoValue">{movieName}</span>
          </p>
          <p className="BookingPage-infoItem">
            <span className="BookingPage-infoLabel">Cinema:</span>
            <span className="BookingPage-infoValue">{cinemaName}</span>
          </p>
          <p className="BookingPage-infoItem">
            <span className="BookingPage-infoLabel">Screen:</span>
            <span className="BookingPage-infoValue">{screenNumber || `Screen ${screenId}`}</span>
          </p>
          <p className="BookingPage-infoItem">
            <span className="BookingPage-infoLabel">Show Time:</span>
            <span className="BookingPage-infoValue">{showTime}</span>
          </p>
        </div>

        {selectionStep === 1 && (
          <>
            <div className="BookingPage-seatGrid">
              {seats.map(seat => (
                <button
                  key={`seat-${seat.Seat_ID}-${seat.seatNumber}`}
                  className={`BookingPage-seat ${
                    seat.available
                      ? selectedSeats.has(seat.seatNumber)
                        ? 'BookingPage-seatSelected'
                        : 'BookingPage-seatAvailable'
                      : 'BookingPage-seatUnavailable'
                  }`}
                  disabled={!seat.available}
                  onClick={() => seat.available && handleSeatSelection(seat.seatNumber)}
                >
                  {seat.seatNumber}
                </button>
              ))}
            </div>

            <div className="BookingPage-selectionSummary">
              <p className="BookingPage-selectedSeats">
                <span className="BookingPage-infoLabel">Selected Seats:</span>
                <span className="BookingPage-infoValue">
                  {[...selectedSeats].join(', ') || 'None'}
                </span>
              </p>
              <button
                className="BookingPage-proceedBtn"
                onClick={() => selectedSeats.size > 0 ? setSelectionStep(2) : setError('Select seats first')}
              >
                Proceed to Payment
              </button>
            </div>
          </>
        )}

        {selectionStep === 2 && (
          <div className="BookingPage-reviewContainer">
            <h2 className="BookingPage-reviewTitle">Review Your Selection</h2>
            <div className="BookingPage-reviewContent">
              <p className="BookingPage-reviewItem">
                <span className="BookingPage-infoLabel">Movie:</span>
                <span className="BookingPage-infoValue">{movieName}</span>
              </p>
              <p className="BookingPage-reviewItem">
                <span className="BookingPage-infoLabel">Selected Seats:</span>
                <span className="BookingPage-infoValue">{[...selectedSeats].join(', ')}</span>
              </p>
             </div>
            <div className="BookingPage-buttonGroup">
              <button 
                className="BookingPage-confirmBtn"
                onClick={handleConfirmBooking}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>
              <button 
                className="BookingPage-backBtn"
                onClick={() => setSelectionStep(1)}
                disabled={loading}
              >
                Back to Seat Selection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;