import React, { useEffect, useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import axios from "axios";
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    id: null
  });
  const [userBookings, setUserBookings] = useState([]);
  const [userComplaints, setUserComplaints] = useState([]);
  const [userPayments, setUserPayments] = useState([]);
  const [userDiscounts, setUserDiscounts] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [newUserInfo, setNewUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [editingComplaintId, setEditingComplaintId] = useState(null);
  const [editComplaintText, setEditComplaintText] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const axiosConfig = {
          headers: { Authorization: `Bearer ${token}`},
        };

        const [userRes, bookingsRes, complaintsRes, paymentsRes, discountsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/users/me", axiosConfig),
          axios.get("http://localhost:5000/api/bookings", axiosConfig),
          axios.get("http://localhost:5000/api/complaints", axiosConfig),
          axios.get("http://localhost:5000/api/payments", axiosConfig),
          axios.get("http://localhost:5000/api/customer-discounts/my-discounts", axiosConfig)
        ]);

        const user = userRes.data.user;
        setUserInfo({
          name: user.User_Name,
          email: user.User_Email,
          phone: user.User_Number,
          id: user.User_ID
        });

        setUserBookings(bookingsRes.data.bookings || []);
        setUserComplaints(complaintsRes.data.complaints || []);
        setUserPayments(paymentsRes.data.payments || []);
        setUserDiscounts(discountsRes.data.myDiscounts || []);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error fetching user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, navigate]);

  const toggleEditMode = () => {
    setEditMode(!editMode);
    setNewUserInfo(editMode ? {
      name: "",
      email: "",
      phone: "",
      password: ""
    } : {
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone,
      password: ""
    });
  };

  const handleInputChange = (e) => {
    setNewUserInfo({
      ...newUserInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}`},
      };
  
      const payload = {
        updatedName: newUserInfo.name,
        updatedEmail: newUserInfo.email,
        updatedPhone: newUserInfo.phone,
      };
  
      if (newUserInfo.password.trim() !== "") {
        payload.updatedPassword = newUserInfo.password;
      }
  
      await axios.put("http://localhost:5000/api/users/me", payload, axiosConfig);
      setUserInfo({
        name: newUserInfo.name,
        email: newUserInfo.email,
        phone: newUserInfo.phone,
        id: userInfo.id
      });
      toggleEditMode();
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to update user information.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleDeleteBooking = async (bookingId) => {
    try {
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.delete(`http://localhost:5000/api/bookings/${bookingId}`, axiosConfig);
      setUserBookings(userBookings.filter(booking => booking.Booking_ID !== bookingId));
    } catch (err) {
      setError("Failed to cancel booking.");
      console.error("Delete booking error:", err); // Add this for better debugging
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
  

  const handleComplaintSubmit = async () => {
    if (!complaintText.trim()) {
      setError("Please enter a complaint before submitting.");
      return;
    }

    try {
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}`},
      };
      const response = await axios.post(
        `http://localhost:5000/api/complaints`,
        { Complaint_Description: complaintText },
        axiosConfig
      );
      setUserComplaints([...userComplaints, response.data]);
      setComplaintText("");
      alert("Complaint submitted successfully!");
    } catch (err) {
      setError("Failed to submit complaint.");
    }
  };

  const handleEditComplaint = (complaint) => {
    setEditingComplaintId(complaint.Complaint_ID);
    setEditComplaintText(complaint.Complaint_Description);
  };

  const handleUpdateComplaint = async () => {
    if (!editComplaintText.trim()) {
      setError("Please enter a complaint description.");
      return;
    }

    try {
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}`},
      };
      await axios.put(
        `http://localhost:5000/api/complaints/${editingComplaintId}`,
        { Complaint_Description: editComplaintText },
        axiosConfig
      );
      setUserComplaints(userComplaints.map(complaint => 
        complaint.Complaint_ID === editingComplaintId 
          ? { ...complaint, Complaint_Description: editComplaintText }
          : complaint
      ));
      setEditingComplaintId(null);
      alert("Complaint updated successfully!");
    } catch (err) {
      setError("Failed to update complaint.");
    }
  };

  const handleDeleteComplaint = async (complaintId) => {
    try {
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}`},
      };
      await axios.delete(`http://localhost:5000/api/complaints/${complaintId}`, axiosConfig);
      setUserComplaints(userComplaints.filter(complaint => complaint.Complaint_ID !== complaintId));
      alert("Complaint deleted successfully!");
    } catch (err) {
      setError("Failed to delete complaint.");
    }
  };

  const handleDeleteUser = async () => {
    try {
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}`},
      };
      await axios.delete(`http://localhost:5000/api/users/${userInfo.id}`, axiosConfig);
      localStorage.removeItem("token");
      navigate("/login");
      alert("Your account has been deleted successfully.");
    } catch (err) {
      setError("Failed to delete account. Please try again.");
      console.error("Error deleting user:", err);
    }
  };

  if (loading) return <div className="ProfilePageLoading">Loading...</div>;
  if (error) return <div className="ProfilePageErrorMessage">{error}</div>;

  return (
    <div className="ProfilePageContainer">
      <div className="ProfilePageNavigation">
        <div className="ProfilePageNavLinks">
          <Link to="/user/shows" className="ProfilePageNavLink">View Shows</Link>
        </div>
        <button onClick={handleLogout} className="ProfilePageLogoutButton">Logout</button>
      </div>

      <div className="ProfilePageHeader">
        <h1 className="ProfilePageTitle">Profile</h1>
        <button className="ProfilePageHomeButton" onClick={() => navigate("/home")}>Home</button>
      </div>

      <div className="ProfilePageContent">
        <div className="ProfilePageUserInfo">
          <h2 className="ProfilePageSectionTitle">User Information</h2>
          {editMode ? (
            <form onSubmit={handleSubmit} className="ProfilePageEditForm">
              <div className="ProfilePageFormGroup">
                <label className="ProfilePageFormLabel">Name:</label>
                <input type="text" name="name" value={newUserInfo.name} onChange={handleInputChange} className="ProfilePageFormInput" required />
              </div>
              <div className="ProfilePageFormGroup">
                <label className="ProfilePageFormLabel">Email:</label>
                <input type="email" name="email" value={newUserInfo.email} onChange={handleInputChange} className="ProfilePageFormInput" required />
              </div>
              <div className="ProfilePageFormGroup">
                <label className="ProfilePageFormLabel">Phone:</label>
                <input type="text" name="phone" value={newUserInfo.phone} onChange={handleInputChange} className="ProfilePageFormInput" required />
              </div>
              <div className="ProfilePageFormGroup">
                <label className="ProfilePageFormLabel">New Password (optional):</label>
                <input type="password" name="password" value={newUserInfo.password} onChange={handleInputChange} className="ProfilePageFormInput" placeholder="Leave blank to keep old password" />
              </div>
              <div className="ProfilePageFormActions">
                <button type="submit" className="ProfilePageSaveButton">Save Changes</button>
                <button type="button" onClick={toggleEditMode} className="ProfilePageCancelButton">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="ProfilePageUserDetails">
              <p className="ProfilePageUserDetail"><span className="ProfilePageDetailLabel">Name:</span> {userInfo.name}</p>
              <p className="ProfilePageUserDetail"><span className="ProfilePageDetailLabel">Email:</span> {userInfo.email}</p>
              <p className="ProfilePageUserDetail"><span className="ProfilePageDetailLabel">Phone:</span> {userInfo.phone}</p>
              <div className="ProfilePageUserActions">
                <button onClick={toggleEditMode} className="ProfilePageEditButton">Edit Profile</button>
                <button onClick={() => setShowDeleteConfirmation(true)} className="ProfilePageDeleteButton">Delete Account</button>
              </div>
            </div>
          )}
        </div>

        {showDeleteConfirmation && (
          <div className="ProfilePageConfirmationModal">
            <div className="ProfilePageModalContent">
              <h3 className="ProfilePageModalTitle">Confirm Account Deletion</h3>
              <p className="ProfilePageModalText">Are you sure you want to delete your account? This action cannot be undone.</p>
              <p className="ProfilePageModalText">All your bookings and complaints will be permanently removed.</p>
              <div className="ProfilePageModalActions">
                <button className="ProfilePageConfirmDeleteButton" onClick={handleDeleteUser}>Yes, Delete My Account</button>
                <button className="ProfilePageCancelDeleteButton" onClick={() => setShowDeleteConfirmation(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="ProfilePageBookings">
          <h2 className="ProfilePageSectionTitle">Your Bookings</h2>
          {userBookings.length > 0 ? (
            <ul className="ProfilePageBookingList">
              {userBookings.map((booking) => (
                <li key={booking.Booking_ID} className="ProfilePageBookingItem">
                  <div className="ProfilePageBookingDetails">
                    <p className="ProfilePageBookingDetail"><span className="ProfilePageDetailLabel">Movie:</span> {booking.Movie_Name}</p>
                    <p className="ProfilePageBookingDetail"><span className="ProfilePageDetailLabel">Cinema:</span> {booking.Cinema_Name}</p>
                    <p className="ProfilePageBookingDetail">
  <span className="ProfilePageDetailLabel">Show Time:</span> 
  {console.log("Show_Time value:", booking.Show_Time)}
  {formatShowTime(booking.Show_Time)}
</p>
                    <p className="ProfilePageBookingDetail"><span className="ProfilePageDetailLabel">Booked On:</span> {formatShowTime(booking.Booking_Time)}</p>
                  </div>
                  <div className="ProfilePageBookingActions">
                    <button onClick={() => handleDeleteBooking(booking.Booking_ID)} className="ProfilePageCancelBookingButton">Cancel Booking</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ProfilePageNoData">No bookings found.</p>
          )}
        </div>

        <div className="ProfilePagePayments">
          <h2 className="ProfilePageSectionTitle">Payment History</h2>
          {userPayments.length > 0 ? (
            <div className="ProfilePagePaymentsTableContainer">
              <table className="ProfilePagePaymentsTable">
                <thead className="ProfilePagePaymentsTableHead">
                  <tr>
                    <th>Payment ID</th>
                    <th>Amount</th>
                       <th>Status</th>
                    <th>Movie</th>
                    <th>Cinema</th>
                    <th>Show Time</th>
                  </tr>
                </thead>
                <tbody className="ProfilePagePaymentsTableBody">
                {userPayments.map((payment) => (
    <tr key={payment.Payment_ID} className="profile-page-payment-row">
      <td>{payment.Payment_ID}</td>
      <td>Rs{payment.Amount.toFixed(2)}</td>
    
      <td className={`profile-page-payment-status profile-page-payment-status-${payment.Payment_Status.toLowerCase()}`}>
        {payment.Payment_Status}
      </td>
      <td>{payment.Movie_Name}</td>
      <td>{payment.Cinema_Name}</td>
      <td>
        {new Date(payment.Show_Time).toLocaleDateString()} at{" "}
        {new Date(payment.Show_Time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          ) : (
            <p className="ProfilePageNoData">No payment history found.</p>
          )}
        </div>

        <div className="ProfilePageComplaints">
          <h2 className="ProfilePageSectionTitle">Your Complaints</h2>
          <div className="ProfilePageAddComplaint">
            <textarea
              placeholder="Describe your complaint here..."
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              className="ProfilePageComplaintTextarea"
            />
            <button onClick={handleComplaintSubmit} className="ProfilePageSubmitComplaintButton">Submit Complaint</button>
          </div>

          {userComplaints.length > 0 ? (
            <ul className="ProfilePageComplaintList">
              {userComplaints.map((complaint) => (
                <li key={complaint.Complaint_ID} className="ProfilePageComplaintItem">
                  {editingComplaintId === complaint.Complaint_ID ? (
                    <div className="ProfilePageEditComplaint">
                      <textarea
                        value={editComplaintText}
                        onChange={(e) => setEditComplaintText(e.target.value)}
                        className="ProfilePageEditComplaintTextarea"
                      />
                      <div className="ProfilePageEditComplaintActions">
                        <button onClick={handleUpdateComplaint} className="ProfilePageUpdateComplaintButton">Update</button>
                        <button onClick={() => setEditingComplaintId(null)} className="ProfilePageCancelEditComplaintButton">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="ProfilePageComplaintDetails">
                      <p className="ProfilePageComplaintText">{complaint.Complaint_Description}</p>
                      <div className="ProfilePageComplaintActions">
                        <button onClick={() => handleEditComplaint(complaint)} className="ProfilePageEditComplaintButton">Edit</button>
                        <button onClick={() => handleDeleteComplaint(complaint.Complaint_ID)} className="ProfilePageDeleteComplaintButton">Delete</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ProfilePageNoData">No complaints found.</p>
          )}
        </div>

        <div className="ProfilePageDiscounts">
          <h2 className="ProfilePageSectionTitle">Your Discounts</h2>
          {userDiscounts.length > 0 ? (
            <ul className="ProfilePageDiscountList">
              {userDiscounts.map((discount) => (
                <li key={discount.Discount_ID} className="ProfilePageDiscountItem">
                  <p className="ProfilePageDiscountDetail"><span className="ProfilePageDetailLabel">Points:</span> {discount.Points}</p>
                  <p className="ProfilePageDiscountDetail"><span className="ProfilePageDetailLabel">Completed Bookings:</span> {discount.CompletedBookings}</p>
                  <p className="ProfilePageDiscountDetail"><span className="ProfilePageDetailLabel">Total Spent:</span> Rs. {discount.TotalSpent || 0}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ProfilePageNoData">No discounts available for your account.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;