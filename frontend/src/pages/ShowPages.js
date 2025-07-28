import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./ShowPages.css"; // Import the CSS file

const ShowsPage = () => {
  const navigate = useNavigate();
  const [activeShows, setActiveShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        };

        const response = await axios.get("http://localhost:5000/api/shows/active", config);
        
        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to fetch shows");
        }

        setActiveShows(response.data.activeShows || []);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.response?.data?.message || err.message || "Error fetching show data");
        
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, token]);

  const formatShowDate = (dateString) => {
    try {
      if (!dateString) return "Date not available";
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Date not available";

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Date not available";
    }
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

  const handleBookNow = (show) => {
    navigate(`/user/booking/${show.Show_ID}`, {
      state: {
        movieName: show.Movie_Name,
        cinemaName: show.Cinema_Name,
        cinemaId: show.Cinema_ID,
        showId: show.Show_ID,
        screenId: show.Screen_ID,
        showDate: formatShowDate(show.Show_Date || show.Show_Time),
        showTime: (show.Show_Time),
        imageLink: show.Image_Link
      }
    });
  };

  if (loading) return <div className="loading-spinner"><i className="fas fa-spinner fa-spin"></i> Loading...</div>;
  if (error) return <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>;

  return (
    <div className="shows-container">
      {/* Navigation Bar */}
      <div className="profile-navigation">
        <div className="navbar-brand">
          <span>🎬</span>
          <span>Freakmax</span>
        </div>
        
        <div className="nav-links">
          <Link to="/home" className="nav-link">
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          
          <Link to="/user/shows" className="nav-link active">
            <i className="fas fa-film"></i>
            <span>Shows</span>
          </Link>

          <Link to="/profile" className="nav-link">
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </Link>
          
          {token ? (
            <button onClick={handleLogout} className="logout-btn">
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          ) : (
            <Link to="/login" className="login-btn">
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
  
      {/* Main Content */}
      <div className="shows-content">
        <h1 className="page-title">
          <i className="fas fa-film"></i>
          <span>Available Shows</span>
        </h1>
  
        {activeShows.length > 0 ? (
          <div className="shows-list">
            {activeShows.map((show) => (
              <div key={show.Show_ID} className="show-card">
                {/* Movie Image Section */}
                {show.Image_Link && (
                  <div className="show-card-image">
                    <img 
                      src={show.Image_Link} 
                      alt={show.Movie_Name}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                )}
                
                <div className="show-card-header">
                  <h3 className="movie-title">{show.Movie_Name}</h3>
                </div>
                
                <div className="show-card-body">
                  <p>
                    <i className="fas fa-theater-masks"></i>
                    <strong>Cinema:</strong> {show.Cinema_Name}
                  </p>
                  
                  <p>
                    <i className="far fa-calendar-alt"></i>
                    <strong>Date:</strong> {formatShowDate(show.Show_Date || show.Show_Time)}
                  </p>
                  
                  <p>
                    <i className="far fa-clock"></i>
                    <strong>Time:</strong> {formatShowTime(show.Show_Time)}
                  </p>
                  
                  <p>
                    <i className="fas fa-tv"></i>
                    <strong>Screen:</strong> {show.Screen_ID}
                  </p>
                </div>
                
                <div className="show-card-footer">
                  <button onClick={() => handleBookNow(show)} className="book-now-btn">
                    <i className="fas fa-ticket-alt"></i>
                    <span>Book Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-shows-message">
            <i className="fas fa-film"></i>
            <p>No shows available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowsPage;