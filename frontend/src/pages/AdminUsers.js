import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}`},
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/users', axiosConfig);
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admins', axiosConfig);
      setAdmins(res.data.admins || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch admins');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAdmins();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`, axiosConfig);
      setSuccess('User banned successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to ban user');
    }
  };

  return (
    <div className="AdminUsersContainer">
      <AdminNavbar />
      <div className="AdminUsersContent">
        <h2 className="AdminUsersTitle">User Management</h2>
        
        {error && (
          <div className="AdminUsersErrorMessage">
            {error}
          </div>
        )}
        
        {success && (
          <div className="AdminUsersSuccessMessage">
            {success}
          </div>
        )}

        <div className="AdminUsersTabs">
          <button
            className={`AdminUsersTabButton ${activeTab === 'users' ? 'AdminUsersTabActive' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            className={`AdminUsersTabButton ${activeTab === 'admins' ? 'AdminUsersTabActive' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            Admins ({admins.length})
          </button>
        </div>

        {activeTab === 'users' ? (
          <div className="AdminUsersTableContainer">
            <table className="AdminUsersTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.User_ID}>
                    <td>{user.User_ID}</td>
                    <td>{user.User_Name}</td>
                    <td>{user.User_Email}</td>
                    <td>{user.User_Number}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(user.User_ID)}
                        className="AdminUsersBanButton"
                      >
                        Ban User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="AdminUsersTableContainer">
            <table className="AdminUsersTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.Admin_ID}>
                    <td>{admin.Admin_ID}</td>
                    <td>{admin.Username}</td>
                    <td>
                      {new Date(admin.Created_At).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;