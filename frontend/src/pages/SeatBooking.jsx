import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'

const SeatBooking = () => {
  const { showId } = useParams()
  const [seats, setSeats] = useState([])
  const [selected, setSelected] = useState([])

  useEffect(() => {
    const fetchSeats = async () => {
      const res = await axios.get(`http://localhost:5000/seat/show/${showId}`)
      setSeats(res.data)
    }
    fetchSeats()
  }, [showId])

  const handleBook = async () => {
    try {
      await axios.post('http://localhost:5000/seatbooking', { showId, seats: selected })
      alert('Seats booked successfully!')
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSeat = (seatId) => {
    setSelected(prev => prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId])
  }

  return (
    <div className="min-h-screen bg-black text-orange-500">
      <Navbar />
      <div className="p-10">
        <h2 className="text-2xl font-bold mb-4">Select Seats</h2>
        <div className="grid grid-cols-6 gap-4">
          {seats.map(seat => (
            <button
              key={seat.id}
              onClick={() => toggleSeat(seat.id)}
              className={`p-4 rounded ${selected.includes(seat.id) ? 'bg-orange-500 text-black' : 'bg-gray-800'}`}
            >
              {seat.number}
            </button>
          ))}
        </div>
        <button onClick={handleBook} className="mt-6 bg-orange-500 text-black px-6 py-2 rounded hover:bg-orange-600">
          Confirm Booking
        </button>
      </div>
    </div>
  )
}

export default SeatBooking
