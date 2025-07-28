import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import backgroundImage from "./logo.jpeg";
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [topMovies, setTopMovies] = useState([]);
  const [childrenMovies, setChildrenMovies] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      console.log("Token not found, redirecting to login.");
      navigate("/login");
      return;
    }
  
    const fetchData = async () => {
      try {
        const axiosConfig = {
          headers: { Authorization: `Bearer ${token}` },
        };
  
        const [topRes, childrenRes, allMoviesRes] = await Promise.all([
          axios.get("http://localhost:5000/api/movies/top5", axiosConfig),
          axios.get("http://localhost:5000/api/movies/children-friendly", axiosConfig),
          axios.get("http://localhost:5000/api/movies", axiosConfig),
        ]);
  
        setTopMovies(topRes.data.data || []);
        setChildrenMovies(childrenRes.data.data || []);
        setMovies(allMoviesRes.data.movies || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.response) {
          setError(
            `Server responded with ${err.response.status}: ${err.response.data.message || "Something went wrong."}`
          );
        } else if (err.request) {
          setError("No response from server. Please check your network.");
        } else {
          setError("An error occurred while setting up the request.");
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [navigate, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const goToProfile = () => {
    navigate("/profile");
  };

  const goToShows = () => {
    navigate("/user/shows");
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (error) return <p className="error-message">{error}</p>;

  const renderMovieCard = (movie) => (
    <div key={movie.Movie_ID} className="movie-card">
      {movie.Image_Link ? (
        <img 
          src={movie.Image_Link} 
          alt={movie.Movie_Name} 
          className="movie-poster"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/200x300?text=No+Poster';
          }}
        />
      ) : (
        <div className="poster-placeholder">
          <span>No Image</span>
        </div>
      )}
      <div className="movie-details">
        <h3 className="movie-title">{movie.Movie_Name}</h3>
        <div className="movie-info">
          <span className="rating">⭐ {movie.Rating}</span>
          <span className="genre">{movie.Genre}</span>
          {movie.Children_Friendly === 'Yes' && <span className="kids-badge">👶 Kid Friendly</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="homepage-wrapper dark-theme">
      {/* Banner Section */}
      <div className="hero-banner" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${backgroundImage})` }}>
        <div className="banner-content">
          <h1>Welcome to Freakmax!</h1>
          <p>Your portal to amazing cinema experiences</p>
          <div className="action-buttons">
            <button className="btn-primary" onClick={goToProfile}>My Profile</button>
            <button className="btn-secondary" onClick={goToShows}>View Shows</button>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Top Movies Section */}
        <section className="movie-section">
          <h2 className="section-title">
            <span className="icon">🎬</span> Top 5 Rated Movies
          </h2>
          <div className="movies-grid">
            {topMovies.length > 0 ? (
              topMovies.map(renderMovieCard)
            ) : (
              <p className="no-movies">No top movies found</p>
            )}
          </div>
        </section>

        {/* Children-Friendly Movies Section */}
        <section className="movie-section">
          <h2 className="section-title">
            <span className="icon">🧒</span> Family Friendly Movies
          </h2>
          <div className="movies-grid">
            {childrenMovies.length > 0 ? (
              childrenMovies.map(renderMovieCard)
            ) : (
              <p className="no-movies">No children-friendly movies found</p>
            )}
          </div>
        </section>

        {/* All Movies Section */}
        <section className="movie-section">
          <h2 className="section-title">
            <span className="icon">🎥</span> All Movies
          </h2>
          <div className="movies-grid">
            {movies.length > 0 ? (
              movies.map(renderMovieCard)
            ) : (
              <p className="no-movies">No movies found in database</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;