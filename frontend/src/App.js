import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UserLogin from './pages/UserLogin';
import AdminLogin from './pages/AdminLogin';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import AdminDashboard from './pages/AdminDashboard';
import AdminMovies from './pages/AdminMovies';
import AdminComplaints from './pages/AdminComplaints';
import AdminPayments from './pages/AdminPayments';
import ShowsPages from './pages/ShowPages';
import AdminBookings from './pages/AdminBookings';
import AdminShows from './pages/AdminShows';
import AdminUsers from './pages/AdminUsers'; // Import the MainPage
import AdminCinemas from './pages/AdminCinemas';
import ProfilePage from './pages/ProfilePage';
import AdminScreens from './pages/AdminScreens';
import AdminSeats from './pages/AdminSeats';
import PaymentPage from './pages/PaymentPage';
import BookingConfirmation from './pages/BookingConfirmation';
import AdminSignup from './pages/AdminSignup';
import AdminScreenSeatTypes from './pages/AdminScreenSeatTypes';
import CoverPage from './pages/CoverPage'; // Import the MainPage
import BookingPage from './pages/BookingPage'; // Import the MainPage
import SeatManagementPage from './pages/SeatManagmenetPage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/user/booking/:showId" element={<BookingPage />} />
        <Route path="/" element={<CoverPage />} /> {/* Root route */}
        <Route path="/login" element={<UserLogin />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/user/shows" element={<ShowsPages />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
        <Route path="/checkout" element={<PaymentPage />} />
        <Route path="/user/seat/management" element={<SeatManagementPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/movies" element={<AdminMovies />} />
        <Route path="/admin/cinemas" element={<AdminCinemas />} />
        <Route path="/admin/shows" element={<AdminShows />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/screenseattypes" element={<AdminScreenSeatTypes />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/screens" element={<AdminScreens />} />
        <Route path="/admin/seats" element={<AdminSeats />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/complaints" element={<AdminComplaints />} />
      </Routes>
    </Router>
  );
}

export default App;