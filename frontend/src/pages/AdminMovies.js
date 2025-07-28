import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import "./AdminMovies.css"

const AdminMovies = () => {
  const [movies, setMovies] = useState([]);
  const [newMovie, setNewMovie] = useState({ 
    Movie_Name: '', 
    Genre: '',
    Duration_Minutes: 0,
    Rating: 0,
    Children_Friendly: 'No',
    Release_Date: new Date().toISOString().split('T')[0],
    Image_Link: ''
  });
  const [editMovie, setEditMovie] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const fetchMovies = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/movies', axiosConfig);
      setMovies(res.data.movies || []);
    } catch (err) {
      setError('Failed to fetch movies');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleAddMovie = async () => {
    try {
      await axios.post('http://localhost:5000/api/movies', newMovie, axiosConfig);
      setNewMovie({ 
        Movie_Name: '', 
        Genre: '',
        Duration_Minutes: 0,
        Rating: 0,
        Children_Friendly: 'No',
        Release_Date: new Date().toISOString().split('T')[0],
        Image_Link: ''
      });
      setSuccess('Movie added successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
      fetchMovies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add movie');
      console.error(err);
    }
  };

  const handleUpdateMovie = async () => {
    try {
      await axios.put(`http://localhost:5000/api/movies/${editMovie.Movie_ID}`, editMovie, axiosConfig);
      setEditMovie(null);
      setSuccess('Movie updated successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
      fetchMovies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update movie');
      console.error(err);
    }
  };

  const handleDeleteMovie = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/movies/${id}`, axiosConfig);
      setSuccess('Movie deleted successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
      fetchMovies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete movie');
      console.error(err);
    }
  };

  return (
    <div className="admin-movies-wrapper admin-movies-container">
      <AdminNavbar />
      <div className="admin-movies-content">
        <h2>All Movies</h2>
        
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="movies-grid">
          {movies.map((movie) => (
            <div key={movie.Movie_ID} className="movie-card">
              {editMovie?.Movie_ID === movie.Movie_ID ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Movie Title:</label>
                    <input 
                      type="text" 
                      value={editMovie.Movie_Name} 
                      onChange={(e) => setEditMovie({ ...editMovie, Movie_Name: e.target.value })} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Genre:</label>
                    <input 
                      type="text" 
                      value={editMovie.Genre} 
                      onChange={(e) => setEditMovie({ ...editMovie, Genre: e.target.value })} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Duration (min):</label>
                    <input 
                      type="number" 
                      value={editMovie.Duration_Minutes} 
                      onChange={(e) => setEditMovie({ ...editMovie, Duration_Minutes: parseInt(e.target.value) || 0 })} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Rating:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="10"
                      value={editMovie.Rating} 
                      onChange={(e) => setEditMovie({ ...editMovie, Rating: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Child Friendly:</label>
                    <select 
                      value={editMovie.Children_Friendly} 
                      onChange={(e) => setEditMovie({ ...editMovie, Children_Friendly: e.target.value })}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Release Date:</label>
                    <input 
                      type="date" 
                      value={editMovie.Release_Date} 
                      onChange={(e) => setEditMovie({ ...editMovie, Release_Date: e.target.value })} 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Image URL:</label>
                    <input 
                      type="text" 
                      value={editMovie.Image_Link || ''} 
                      onChange={(e) => setEditMovie({ ...editMovie, Image_Link: e.target.value })} 
                      placeholder="Enter image URL"
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button className="btn-save" onClick={handleUpdateMovie}>Save</button>
                    <button className="btn-cancel" onClick={() => setEditMovie(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="movie-poster">
                    {movie.Image_Link ? (
                      <img src={movie.Image_Link} alt={movie.Movie_Name} onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x300?text=No+Image';
                      }} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>
                  
                  <div className="movie-details">
                    <h3>{movie.Movie_Name}</h3>
                    <p><strong>Genre:</strong> {movie.Genre}</p>
                    <p><strong>Duration:</strong> {movie.Duration_Minutes} mins</p>
                    <p><strong>Rating:</strong> ⭐{movie.Rating}</p>
                    <p><strong>Child Friendly:</strong> {movie.Children_Friendly}</p>
                    <p><strong>Release Date:</strong> {new Date(movie.Release_Date).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="movie-actions">
                    <button className="btn-edit" onClick={() => setEditMovie({...movie})}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDeleteMovie(movie.Movie_ID)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <h2>Add New Movie</h2>
        <div className="add-movie-form">
          <div className="form-group">
            <label>Movie Title:</label>
            <input 
              type="text" 
              value={newMovie.Movie_Name} 
              onChange={(e) => setNewMovie({ ...newMovie, Movie_Name: e.target.value })} 
            />
          </div>
          
          <div className="form-group">
            <label>Genre:</label>
            <input 
              type="text" 
              value={newMovie.Genre} 
              onChange={(e) => setNewMovie({ ...newMovie, Genre: e.target.value })} 
            />
          </div>
          
          <div className="form-group">
            <label>Duration (minutes):</label>
            <input 
              type="number" 
              value={newMovie.Duration_Minutes} 
              onChange={(e) => setNewMovie({ ...newMovie, Duration_Minutes: parseInt(e.target.value) || 0 })} 
            />
          </div>
          
          <div className="form-group">
            <label>Rating:</label>
            <input 
              type="number" 
              step="0.1"
              min="0"
              max="10"
              value={newMovie.Rating} 
              onChange={(e) => setNewMovie({ ...newMovie, Rating: parseFloat(e.target.value) || 0 })} 
            />
          </div>
          
          <div className="form-group">
            <label>Child Friendly:</label>
            <select 
              value={newMovie.Children_Friendly} 
              onChange={(e) => setNewMovie({ ...newMovie, Children_Friendly: e.target.value })}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Release Date:</label>
            <input 
              type="date" 
              value={newMovie.Release_Date} 
              onChange={(e) => setNewMovie({ ...newMovie, Release_Date: e.target.value })} 
            />
          </div>
          
          <div className="form-group">
            <label>Image URL:</label>
            <input 
              type="text" 
              value={newMovie.Image_Link} 
              onChange={(e) => setNewMovie({ ...newMovie, Image_Link: e.target.value })} 
              placeholder="Enter image URL"
            />
          </div>
          
          <button className="btn-add" onClick={handleAddMovie}>Add Movie</button>
        </div>
      </div>
    </div>
  );
};

export default AdminMovies;