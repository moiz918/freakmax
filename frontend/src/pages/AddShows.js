import React, { useState, useEffect } from "react";
import axios from "axios";

const AddShow = () => {
    const [movies, setMovies] = useState([]);
    const [cinemas, setCinemas] = useState([]);
    const [Cinema_ID, setCinema_ID] = useState("");
    const [Screen_ID, setScreen_ID] = useState("");  // Add screen selection logic if needed
    const [Movie_ID, setMovie_ID] = useState("");
    const [Show_Time, setShow_Time] = useState("");
    const [Show_Date, setShow_Date] = useState("");
    const [message, setMessage] = useState("");

    // Fetch movies and cinemas on component mount
    useEffect(() => {
        const fetchMoviesAndCinemas = async () => {
            try {
                const moviesRes = await axios.get("/api/movies");
                const cinemasRes = await axios.get("/api/cinemas");

                if (moviesRes.data.success) setMovies(moviesRes.data.movies);
                if (cinemasRes.data.success) setCinemas(cinemasRes.data.cinemas);
            } catch (error) {
                setMessage("Error fetching movies or cinemas");
            }
        };

        fetchMoviesAndCinemas();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post("/api/showtimings", {
                Cinema_ID,
                Screen_ID,
                Movie_ID,
                Show_Time,
                Show_Date,
            });

            if (response.data.success) {
                setMessage("Show added successfully!");
            } else {
                setMessage("Failed to add show: " + response.data.message);
            }
        } catch (error) {
            setMessage("Error adding show");
        }
    };

    return (
        <div>
            <h1>Add Show Timing</h1>
            {message && <p>{message}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Choose Cinema:</label>
                    <select value={Cinema_ID} onChange={(e) => setCinema_ID(e.target.value)} required>
                        <option value="">Select Cinema</option>
                        {cinemas.map((cinema) => (
                            <option key={cinema.Cinema_ID} value={cinema.Cinema_ID}>
                                {cinema.Cinema_Name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Choose Movie:</label>
                    <select value={Movie_ID} onChange={(e) => setMovie_ID(e.target.value)} required>
                        <option value="">Select Movie</option>
                        {movies.map((movie) => (
                            <option key={movie.Movie_ID} value={movie.Movie_ID}>
                                {movie.Movie_Name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Show Time:</label>
                    <input
                        type="text"
                        value={Show_Time}
                        onChange={(e) => setShow_Time(e.target.value)}
                        placeholder="HH:MM or HH:MM:SS"
                        required
                    />
                </div>

                <div>
                    <label>Show Date:</label>
                    <input
                        type="date"
                        value={Show_Date}
                        onChange={(e) => setShow_Date(e.target.value)}
                        required
                    />
                </div>

                <button type="submit">Add Show</button>
            </form>
        </div>
    );
};

export default AddShow;
