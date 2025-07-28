import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import './AdminComplaints.css';

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('Open');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/complaints', axiosConfig);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch complaints');
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleEditClick = (complaint) => {
    setEditingId(complaint.Complaint_ID);
    setEditStatus(complaint.Complaint_Status);
  };

  const handleUpdateStatus = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/complaints/${editingId}`,
        { Complaint_Status: editStatus },
        axiosConfig
      );
      setSuccess('Complaint status updated successfully');
      setEditingId(null);
      setTimeout(() => setSuccess(''), 3000);
      fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update complaint status');
    }
  };

  const handleDeleteComplaint = async (complaintId) => {
    if (!window.confirm('Are you sure you want to delete this complaint?')) return;
    
    try {
      await axios.delete(
        `http://localhost:5000/api/complaints/${complaintId}`,
        axiosConfig
      );
      setSuccess('Complaint deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchComplaints();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete complaint');
    }
  };

  return (
    <div className="admin-complaints-container">
      <AdminNavbar />
      <div className="admin-complaints-content">
        <h2 className="admin-complaints-title">Complaint Management</h2>
        
        {error && (
          <div className="admin-complaints-error">
            {error}
          </div>
        )}
        
        {success && (
          <div className="admin-complaints-success">
            {success}
          </div>
        )}

        <div className="admin-complaints-table-container">
          <table className="admin-complaints-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Description</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr key={complaint.Complaint_ID}>
                  <td className="text-center">{complaint.Complaint_ID}</td>
                  <td>{complaint.User_Name}</td>
                  <td>{complaint.User_Email}</td>
                  <td>{complaint.Complaint_Description}</td>
                  <td className="text-center">
                    {editingId === complaint.Complaint_ID ? (
                      <select
                        className="admin-complaints-status-select"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                      </select>
                    ) : (
                      <span className={`admin-complaints-status admin-complaints-status-${complaint.Complaint_Status.toLowerCase()}`}>
                        {complaint.Complaint_Status}
                      </span>
                    )}
                  </td>
                  <td>{complaint.Created_Time}</td>
                  <td className="text-center">
                    {editingId === complaint.Complaint_ID ? (
                      <>
                        <button
                          onClick={handleUpdateStatus}
                          className="admin-complaints-save-btn"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="admin-complaints-cancel-btn"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(complaint)}
                          className="admin-complaints-edit-btn"
                        >
                          Edit Status
                        </button>
                        <button
                          onClick={() => handleDeleteComplaint(complaint.Complaint_ID)}
                          className="admin-complaints-delete-btn"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminComplaints;