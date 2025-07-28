import { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

const MoviesList = () => {
  const [movies, setMovies] = useState([])

  useEffect(() => {
    const fetchMovies = async () => {
      const res = await axios.get('http://localhost:5000/movies')
      setMovies(res.data)
    }
    fetchMovies()
  }, [])

  return (
    <div className="min-h-screen bg-black text-orange-500">
      <Navbar />
      <div className="p-10">
        <h2 className="text-2xl font-bold mb-4">Movies</h2>
        <ul>
          {movies.map(movie => (
            <li key={movie.id} className="border-b border-orange-500 py-2">
              🎥 {movie.name} - {movie.genre}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default MoviesList
