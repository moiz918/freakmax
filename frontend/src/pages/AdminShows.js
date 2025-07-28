import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar'; // Adjust path as needed
import './AdminShows.css'


const AdminShows = () => {
  const [showTimings, setShowTimings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    cinema: '',
    movie: '',
    date: ''
  });
  const [cinemas, setCinemas] = useState([]);
  const [movies, setMovies] = useState([]);
  const [editingShow, setEditingShow] = useState(null);
  const [editForm, setEditForm] = useState({
    Show_Date: '',
    Cinema_ID: '',
    Screen_ID: '',
    Movie_ID: ''
  });
  const [screens, setScreens] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const token = localStorage.getItem('token');

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Authentication token missing. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const fetchShowTimings = fetch('http://localhost:5000/api/show-timings', axiosConfig);
      const fetchCinemas = fetch('http://localhost:5000/api/cinemas', axiosConfig);
      const fetchMovies = fetch('http://localhost:5000/api/movies', axiosConfig);
      const fetchScreens = fetch('http://localhost:5000/api/screens', axiosConfig);

      const [timingsRes, cinemasRes, moviesRes, screensRes] = await Promise.all([
        fetchShowTimings,
        fetchCinemas,
        fetchMovies,
        fetchScreens
      ]);

      if (!timingsRes.ok) throw new Error(`Show timings: ${timingsRes.statusText}`);
      if (!cinemasRes.ok) throw new Error(`Cinemas: ${cinemasRes.statusText}`);
      if (!moviesRes.ok) throw new Error(`Movies: ${moviesRes.statusText}`);
      if (!screensRes.ok) throw new Error(`Screens: ${screensRes.statusText}`);

      const timingsData = await timingsRes.json();
      const cinemasData = await cinemasRes.json();
      const moviesData = await moviesRes.json();
      const screensData = await screensRes.json();

      setShowTimings(timingsData.showTimings || []);
      setCinemas(cinemasData.cinemas || []);
      setMovies(moviesData.movies || []);
      setScreens(screensData.screens || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data. Please try again.');
      showNotification(err.message || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatShowTime = (timeString) => {
    if (!timeString) return 'Invalid Time';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('Time formatting error:', err);
      return timeString;
    }
  };

  const formatShowDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (err) {
      console.error('Date formatting error:', err);
      return dateString;
    }
  };

  const getCinemaName = (cinemaId) => {
    const cinema = cinemas.find(c => c.Cinema_ID === cinemaId);
    return cinema ? cinema.Cinema_Name : 'Unknown Cinema';
  };

  const getMovieName = (movieId) => {
    const movie = movies.find(m => m.Movie_ID === movieId);
    return movie ? movie.Movie_Name : 'Unknown Movie';
  };

  const getScreensForCinema = (cinemaId) => {
    return screens.filter(screen => screen.Cinema_ID === cinemaId);
  };

  const filteredShows = showTimings.filter(show => {
    return (
      (filters.cinema === '' || show.Cinema_ID.toString() === filters.cinema) &&
      (filters.movie === '' || show.Movie_ID.toString() === filters.movie) &&
      (filters.date === '' || show.Show_Date.split('T')[0] === filters.date)
    );
  });

  const handleEditClick = (show) => {
    const datePart = show.Show_Date.split('T')[0];
    setEditingShow(show);
    setEditForm({
      Show_Date: datePart,
      Cinema_ID: show.Cinema_ID.toString(),
      Screen_ID: show.Screen_ID.toString(),
      Movie_ID: show.Movie_ID.toString()
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
  
    if (!editForm.Show_Date || !editForm.Cinema_ID || !editForm.Screen_ID || !editForm.Movie_ID) {
      showNotification('Please fill all required fields', 'error');
      return;
    }
  
    try {
      setActionLoading(true);
  
      const requestBody = {
        Show_Date: editForm.Show_Date,
        Cinema_ID: parseInt(editForm.Cinema_ID),
        Screen_ID: parseInt(editForm.Screen_ID),
        Movie_ID: parseInt(editForm.Movie_ID)
      };
  
      const response = await axios.put(
        `http://localhost:5000/api/show-timings/${editingShow.Show_ID}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
  
      showNotification(response.data.message || 'Show timing updated successfully');
      setEditingShow(null);
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to update show timing';
      
      showNotification(errorMessage, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (showId) => {
    try {
      setActionLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/show-timings/${showId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete show timing');
      }

      const data = await response.json();
      showNotification(data.message || 'Show timing deleted successfully');
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to delete show timing', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shows-container">
      <AdminNavbar />
      <div className="container mx-auto px-4 py-8">
        <h2 className="admin-shows-header">Show Timings Management</h2>
  
        {notification.show && (
          <div className={`admin-show-notification ${
            notification.type === 'error' 
              ? 'admin-show-notification-error' 
              : 'admin-show-notification-success'
          }`}>
            {notification.message}
          </div>
        )}
  
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
  
        <div className="admin-shows-filter-panel">
          <h3>Filter Shows</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cinema</label>
              <select
                className="admin-shows-select"
                value={filters.cinema}
                onChange={(e) => setFilters({...filters, cinema: e.target.value})}
              >
                <option value="">All Cinemas</option>
                {cinemas.map(cinema => (
                  <option key={cinema.Cinema_ID} value={cinema.Cinema_ID.toString()}>
                    {cinema.Cinema_Name}
                  </option>
                ))}
              </select>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Movie</label>
              <select
                className="admin-shows-select"
                value={filters.movie}
                onChange={(e) => setFilters({...filters, movie: e.target.value})}
              >
                <option value="">All Movies</option>
                {movies.map(movie => (
                  <option key={movie.Movie_ID} value={movie.Movie_ID.toString()}>
                    {movie.Movie_Name}
                  </option>
                ))}
              </select>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
              <input
                type="date"
                className="admin-shows-select"
                value={filters.date}
                onChange={(e) => setFilters({...filters, date: e.target.value})}
              />
            </div>
          </div>
        </div>
  
        {editingShow && (
          <div className="admin-show-modal">
            <div className="admin-show-modal-content">
              <h3 className="admin-show-modal-header">Edit Show Timing</h3>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    name="Show_Date"
                    value={editForm.Show_Date}
                    onChange={handleEditChange}
                    className="admin-shows-select"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cinema</label>
                  <select
                    name="Cinema_ID"
                    value={editForm.Cinema_ID}
                    onChange={handleEditChange}
                    className="admin-shows-select"
                    required
                  >
                    <option value="">Select Cinema</option>
                    {cinemas.map(cinema => (
                      <option key={cinema.Cinema_ID} value={cinema.Cinema_ID.toString()}>
                        {cinema.Cinema_Name}
                      </option>
                    ))}
                  </select>
                </div>
  
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Screen</label>
                  <select
                    name="Screen_ID"
                    value={editForm.Screen_ID}
                    onChange={handleEditChange}
                    className="admin-shows-select"
                    required
                  >
                    <option value="">Select Screen</option>
                    {getScreensForCinema(parseInt(editForm.Cinema_ID || 0)).map(screen => (
                      <option key={screen.Screen_ID} value={screen.Screen_ID.toString()}>
                        Screen {screen.Screen_ID} - {screen.Screen_Category} ({screen.Total_Seats} seats)
                      </option>
                    ))}
                  </select>
                </div>
  
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Movie</label>
                  <select
                    name="Movie_ID"
                    value={editForm.Movie_ID}
                    onChange={handleEditChange}
                    className="admin-shows-select"
                    required
                  >
                    <option value="">Select Movie</option>
                    {movies.map(movie => (
                      <option key={movie.Movie_ID} value={movie.Movie_ID.toString()}>
                        {movie.Movie_Name}
                      </option>
                    ))}
                  </select>
                </div>
  
                <div className="admin-show-modal-footer">
                  <button
                    type="button"
                    className="admin-show-button admin-show-button-delete"
                    onClick={() => setEditingShow(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-show-button admin-show-button-edit"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
  
        <div className="admin-shows-vertical-list">
          {filteredShows.map(show => (
            <div key={show.Show_ID} className="admin-show-card">
              <h3>{getMovieName(show.Movie_ID)}</h3>
              
              <div className="admin-show-detail">
                <span className="admin-show-detail-label">Cinema:</span>
                <span>{getCinemaName(show.Cinema_ID)}</span>
              </div>
              
              <div className="admin-show-detail">
                <span className="admin-show-detail-label">Date:</span>
                <span>{formatShowDate(show.Show_Date)}</span>
              </div>
              
              <div className="admin-show-detail">
                <span className="admin-show-detail-label">Time:</span>
                <span>{formatShowTime(show.Show_Time)}</span>
              </div>
              
              <div className="admin-show-actions">
                <button
                  className="admin-show-button admin-show-button-edit"
                  onClick={() => handleEditClick(show)}
                >
                  Edit
                </button>
                <button
                  className="admin-show-button admin-show-button-delete"
                  onClick={() => setDeleteConfirm(show.Show_ID)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
          
          {filteredShows.length === 0 && (
            <div className="admin-show-card">
              <p className="text-center">No show timings match the selected filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminShows;