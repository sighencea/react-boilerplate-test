import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom'; // For navigation if link_to is used

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      // setError("User not authenticated."); // ProtectedRoute should handle this
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Assuming a 'notifications' table with user_id, message, created_at, is_read, link_to
      // And that RLS is set up for users to only select their own notifications.
      const { data, error: dbError } = await supabase
        .from('notifications')
        .select('*')
        // .eq('user_id', user.id) // RLS should ideally handle this, but explicit can be fine
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (updateError) throw updateError;
      // Refresh list or update locally
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      alert(`Failed to mark as read: ${err.message}`); // Simple alert for now
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) {
        alert("No unread notifications to mark.");
        return;
    }
    try {
      // RLS should ensure user can only update their own notifications.
      // If user_id is not part of primary key, this might need to be .eq('user_id', user.id) as well.
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      if (updateError) throw updateError;
      fetchNotifications(); // Easiest way to refresh all states
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      alert(`Failed to mark all as read: ${err.message}`);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const secondsPast = Math.floor((now - new Date(timestamp)) / 1000);
    if (secondsPast < 60) return `${secondsPast}s ago`;
    const minutesPast = Math.floor(secondsPast / 60);
    if (minutesPast < 60) return `${minutesPast}m ago`;
    const hoursPast = Math.floor(minutesPast / 60);
    if (hoursPast < 24) return `${hoursPast}h ago`;
    const daysPast = Math.floor(hoursPast / 24);
    if (daysPast < 7) return `${daysPast}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };


  if (loading) return <p className="container mt-4">Loading notifications...</p>;
  // Error shown only if no notifications are loaded due to it.
  if (error && notifications.length === 0) return <p className="container mt-4 text-danger">Error fetching notifications: {error}</p>;

  return (
    <div className="container-fluid pt-3">
      <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
        <h1 className="h2" data-i18n="notificationsPage.title">Notifications</h1>
        {notifications.some(n => !n.is_read) && ( // Show button only if there are unread notifications
            <button className="btn btn-sm btn-outline-secondary" id="markAllAsReadBtn" onClick={handleMarkAllAsRead} data-i18n="notificationsPage.markAllRead">
            Mark all as read
            </button>
        )}
      </div>

      {error && notifications.length > 0 && <div className="alert alert-warning">Could not fully update notifications: {error}</div>}

      {notifications.length === 0 && !loading ? (
        <p id="noNotificationsMessage" className="text-center text-muted mt-3" data-i18n="notificationsPage.noNotifications">
          You have no new notifications.
        </p>
      ) : (
        <div className="list-group" id="notificationsList">
          {notifications.map(notification => {
            const Wrapper = notification.link_to ? Link : 'div';
            const wrapperProps = notification.link_to ? { to: notification.link_to } : {};

            return (
              <Wrapper
                key={notification.id}
                {...wrapperProps}
                className={`list-group-item list-group-item-action ${notification.is_read ? 'notification-read' : ''}`}
                // For non-Link wrapper, onClick could mark as read if desired
                onClick={!notification.is_read && !notification.link_to ? () => handleMarkAsRead(notification.id) : undefined}
              >
                <div className="d-flex w-100 justify-content-between">
                  <h5 className="mb-1">{notification.title || 'Notification'}</h5>
                  <small className="text-muted">{formatTimeAgo(notification.created_at)}</small>
                </div>
                <p className="mb-1">{notification.message || 'No message content.'}</p>
                {!notification.is_read && notification.link_to && ( // Show explicit mark as read if it's a link and unread
                    <button
                        className="btn btn-sm btn-link p-0 text-decoration-none float-end"
                        onClick={(e) => {
                            e.preventDefault(); // Prevent navigation if it's a Link wrapper
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                        }}
                    >
                        Mark as read
                    </button>
                )}
                 {!notification.is_read && !notification.link_to && (
                     <small className="text-muted d-block mt-1">(Click to mark as read)</small>
                 )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
