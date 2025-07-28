import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const SeatManagementPage = () => {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [screenInfo, setScreenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('role') === 'admin';

  const { movieName, cinemaName, showTime, screenNumber } = location.state || {};

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchSeats = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        };

        const response = await axios.get(`http://localhost:5000/api/shows/${showId}/seats`, config);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to fetch seats');
        }

        setScreenInfo(response.data.screenInfo);
        setSeats(response.data.seats);
      } catch (err) {
        console.error('Error fetching seats:', err);
        setError(err.response?.data?.message || err.message || 'Error fetching seat data');
      } finally {
        setLoading(false);
      }
    };

    fetchSeats();
  }, [showId, navigate, token]);

  const handleSeatSelection = (seatNumber) => {
    setSelectedSeats(prev => {
      const updated = new Set(prev);
      if (updated.has(seatNumber)) {
        updated.delete(seatNumber);
      } else {
        updated.add(seatNumber);
      }
      return updated;
    });
  };

  const checkAndAddSeats = async () => {
    if (!isAdmin || !screenInfo) {
      setError('Admin privileges required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setNotification('');

      const Screen_ID = screenInfo.screenId || screenInfo.Screen_ID;
      if (!Screen_ID) throw new Error('Screen ID not available');

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      // Get existing seat numbers for this screen
      const existingSeatsResponse = await axios.get(
        `http://localhost:5000/api/screens/${Screen_ID}/seats`,
        config
      );

      const existingSeatNumbers = new Set(
        existingSeatsResponse.data.seats.map(seat => `${seat.Aisle}${seat.Seat_Number}`)
      );

      const seatsToAdd = [...selectedSeats].filter(seatNum => !existingSeatNumbers.has(seatNum));

      if (seatsToAdd.length === 0) {
        setNotification('All selected seats already exist in the database');
        return;
      }

      // Add new seats
      const addSeatPromises = seatsToAdd.map(seat => {
        // Extract aisle (first character) and seat number (remaining characters)
        const aisle = seat[0];
        const seatNumber = parseInt(seat.slice(1));

        return axios.post(
          'http://localhost:5000/api/seats',
          {
            Screen_ID,
            Seat_Number: seatNumber,
            Aisle: aisle,
            Seat_Type: 'Gold', // Default type, can be made configurable
            Availability_Of_Seat: 'Yes',
          },
          config
        );
      });

      const results = await Promise.allSettled(addSeatPromises);
      const failedAdds = results.filter(r => r.status === 'rejected');

      if (failedAdds.length > 0) {
        throw new Error(`${failedAdds.length} seats failed to add`);
      }

      setNotification(`Successfully added ${seatsToAdd.length} new seats`);
      
      // Refresh the seat data
      const seatsResponse = await axios.get(`http://localhost:5000/api/shows/${showId}/seats`, config);
      if (seatsResponse.data.success) {
        setSeats(seatsResponse.data.seats);
      }
    } catch (err) {
      console.error('Error adding seats:', err);
      setError(err.response?.data?.message || err.message || 'Error adding seats');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewSeat = () => {
    const seatInput = window.prompt('Enter new seat (format A1, B2, etc.):');
    
    if (!seatInput) return;

    // Validate format (letter followed by number)
    if (!/^[A-Z]\d+$/.test(seatInput)) {
      setError('Invalid format. Use format like A1, B2, etc.');
      return;
    }

    const exists = seats.some(seat => seat.seatNumber === seatInput);
    if (exists) {
      setError(`Seat ${seatInput} already exists`);
    } else {
      setSelectedSeats(prev => new Set([...prev, seatInput]));
      setNotification(`Seat ${seatInput} added to selection`);
    }
  };

  if (loading) return (
    <div className="loading flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="seat-management-container p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Seat Management for: {movieName || screenInfo?.movieName}</h2>

      {notification && <div className="notification success bg-green-100 border-l-4 border-green-500 p-4 mb-4">{notification}</div>}
      {error && <div className="notification error bg-red-100 border-l-4 border-red-500 p-4 mb-4">{error}</div>}

      <div className="screen-info bg-gray-50 p-4 rounded mb-6">
        <p className="mb-2"><strong>Cinema:</strong> {cinemaName || screenInfo?.cinemaName}</p>
        <p className="mb-2"><strong>Screen:</strong> {screenNumber || screenInfo?.screenNumber}</p>
        <p><strong>Screen ID:</strong> {screenInfo?.screenId || screenInfo?.Screen_ID}</p>
      </div>

      <div className="screen-layout mb-6">
        <div className="screen-label bg-gray-800 text-white text-center p-2 mb-8 rounded">SCREEN</div>
        <div className="seats-grid grid grid-cols-10 gap-2">
          {seats.map(seat => (
            <button
              key={seat.seatNumber}
              className={`seat p-2 rounded text-center 
                ${selectedSeats.has(seat.seatNumber) ? 'bg-green-500 text-white' : 'bg-blue-100 hover:bg-blue-200'}`}
              onClick={() => handleSeatSelection(seat.seatNumber)}
            >
              {seat.seatNumber}
            </button>
          ))}
        </div>
      </div>

      <div className="seat-actions">
        <div className="seat-legend flex space-x-4 mb-4">
          <span className="legend available flex items-center">
            <span className="w-4 h-4 bg-blue-100 mr-2 inline-block"></span>Available
          </span>
          <span className="legend selected flex items-center">
            <span className="w-4 h-4 bg-green-500 mr-2 inline-block"></span>Selected
          </span>
        </div>

        <div className="action-buttons flex space-x-4">
          <button 
            onClick={handleAddNewSeat} 
            className="add-seat-btn bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Add New Seat
          </button>
          
          {selectedSeats.size > 0 && (
            <button 
              onClick={checkAndAddSeats} 
              className="check-add-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Check and Add Seats ({selectedSeats.size})
            </button>
          )}
        </div>

        {selectedSeats.size > 0 && (
          <div className="selected-seats mt-4 p-4 bg-gray-50 rounded">
            <p className="font-semibold">Selected Seats:</p>
            <div className="seat-list flex flex-wrap gap-2 mt-2">
              {[...selectedSeats].map(seat => (
                <span key={seat} className="bg-blue-100 px-3 py-1 rounded">{seat}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatManagementPage;