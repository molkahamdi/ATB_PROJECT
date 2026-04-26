// src/components/NotificationBell.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type Notification } from '../services/adminApi';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Connexion SSE pour les notifications en temps réel
    const token = localStorage.getItem('admin_token');
    const eventSource = new EventSource(`http://localhost:3000/admin/notifications/stream?token=${encodeURIComponent(token || '')}`);

    eventSource.onmessage = (event) => {
      const newNotification = JSON.parse(event.data);
      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);

      // Notification browser
      if (Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
          icon: '/atb-logo.png',
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    // Demander permission pour notifications browser
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      eventSource.close();
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    navigate(`/dossiers/${notification.customerId}`);
    setIsOpen(false);
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'à l\'instant';
    if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          padding: 8,
          borderRadius: 8,
          transition: 'background 0.15s',
          color: '#94a3b8',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: '#b33a2c',
            color: 'white',
            fontSize: 10,
            fontWeight: 'bold',
            borderRadius: 10,
            padding: '2px 6px',
            minWidth: 18,
            textAlign: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          
          <div style={{
            position: 'absolute',
            top: 50,
            right: 0,
            width: 380,
            maxHeight: 450,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 999,
            overflow: 'hidden',
            border: '1px solid #e4e7ec',
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #eef1f5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2533' }}>
                📋 Nouveaux dossiers
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: 8,
                    background: '#eef3fc',
                    color: '#2266a8',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}>
                    {unreadCount}
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 11,
                    color: '#2266a8',
                    cursor: 'pointer',
                  }}
                >
                  Tout lire
                </button>
              )}
            </div>
            
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#8a97ae' }}>Chargement...</div>
              ) : notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#8a97ae' }}>🔕 Aucun nouveau dossier</div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #eef1f5',
                      cursor: 'pointer',
                      background: notif.read ? '#fff' : '#eef3fc',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f7f8fa'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.read ? '#fff' : '#eef3fc'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2533' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#5f6c84', marginTop: 4 }}>
                          {notif.message}
                        </div>
                        <div style={{ fontSize: 10, color: '#8a97ae', marginTop: 6 }}>
                          {formatTime(notif.timestamp)}
                        </div>
                      </div>
                      {!notif.read && (
                        <div style={{ width: 8, height: 8, background: '#2266a8', borderRadius: '50%' }} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};