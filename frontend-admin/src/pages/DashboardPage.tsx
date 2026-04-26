// src/pages/DashboardPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { getStats, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, type AdminStats, type Notification } from '../services/adminApi';
import { Spinner } from '../components/ui';
import { Layout } from '../components/Layout';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Palette professionnelle - tons bancaires sobres
const palette = {
  bg:           '#f5f7fc',
  white:        '#ffffff',
  border:       '#e8ecf2',
  textPrimary:  '#1a2c3e',
  textSecondary: '#5b6e8c',
  textMuted:    '#8a9bb0',
  warning:      '#c47b2e',
  success:      '#278a5c',
  danger:       '#b33a2c',
  info:         '#2266a8',
  gold:         '#9e7f4c',
  notifBg:      '#f0f4fa',
  notifBorder:  '#dce3ec',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getStats(), getNotifications()])
      .then(([statsData, notifData]) => {
        setStats(statsData);
        setNotifications(notifData.data);
        setUnreadCount(notifData.unreadCount);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    const token = localStorage.getItem('admin_token');
    const eventSource = new EventSource(`http://localhost:3000/admin/notifications/stream?token=${encodeURIComponent(token || '')}`);

    eventSource.onmessage = (event) => {
      const newNotification = JSON.parse(event.data);
      setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      setUnreadCount(prev => prev + 1);
    };

    eventSource.onerror = () => eventSource.close();

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsNotifOpen(false);
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
    if (diff < 604800000) return `il y a ${Math.floor(diff / 86400000)} j`;
    return date.toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });
  };

  if (loading) return <Layout><div style={{ display:'flex', justifyContent:'center', padding: 100 }}><Spinner size={36} /></div></Layout>;
  if (error)   return <Layout><div style={{ padding: 40, color: palette.danger }}>Erreur : {error}</div></Layout>;
  if (!stats)  return null;

  const barData = {
    labels: stats.dailyVolume.map(d => d.date.slice(5)),
    datasets: [
      { label: 'Soumis', data: stats.dailyVolume.map(d => d.soumis), backgroundColor: palette.warning, borderRadius: 4, barPercentage: 0.65 },
      { label: 'Approuvés', data: stats.dailyVolume.map(d => d.approuves), backgroundColor: palette.success, borderRadius: 4, barPercentage: 0.65 },
      { label: 'Rejetés', data: stats.dailyVolume.map(d => d.rejetes), backgroundColor: palette.danger, borderRadius: 4, barPercentage: 0.65 },
    ],
  };

  const doughnutFlux = {
    labels: ['Manuel', 'E-Houwiya'],
    datasets: [{ data: [stats.totalManual, stats.totalEhouwiya], backgroundColor: [palette.info, palette.success], borderWidth: 0 }],
  };

  const doughnutStatut = {
    labels: ['Soumis', 'Approuvés', 'Rejetés'],
    datasets: [{ data: [stats.totalSoumis, stats.totalApprouves, stats.totalRejetes], backgroundColor: [palette.warning, palette.success, palette.danger], borderWidth: 0 }],
  };

  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { padding: 12, font: { size: 10, weight: 500 }, usePointStyle: true, boxWidth: 5 } },
      tooltip: { backgroundColor: palette.textPrimary, titleColor: palette.white, bodyColor: palette.textMuted, cornerRadius: 8 },
    },
    cutout: '72%',
    animation: { animateRotate: true, animateScale: true, duration: 1000, easing: 'easeOutQuart' as const },
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { padding: 10, font: { size: 10, weight: 500 }, usePointStyle: true, boxWidth: 5 } },
      tooltip: { backgroundColor: palette.textPrimary, cornerRadius: 8 },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: palette.textMuted }, grid: { color: palette.border } },
      x: { ticks: { color: palette.textMuted }, grid: { display: false } },
    },
    animation: { duration: 800, easing: 'easeOutQuart' as const },
  };

  const total = stats.totalSoumis + stats.totalApprouves + stats.totalRejetes;
  const hasUnread = unreadCount > 0;
  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <Layout>
      <div style={{ background: palette.bg, minHeight: '100vh', padding: '28px 32px' }}>

        {/* En-tête avec notifications */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: palette.textPrimary, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              Tableau de bord
            </h1>
            <p style={{ fontSize: 13, color: palette.textSecondary, margin: 0 }}>
              {total} dossier{total > 1 ? 's' : ''} · {stats.dossiersAujourdHui} soumis aujourd'hui
            </p>
          </div>

          {/* Notification - Design épuré sans émojis */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                padding: '6px 12px 6px 8px',
                borderRadius: 32,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = palette.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Icône cloche SVG épurée */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" 
                  fill={hasUnread ? palette.info : palette.textMuted}/>
                {hasUnread && (
                  <circle cx="18" cy="6" r="4.5" fill={palette.danger} stroke={palette.bg} strokeWidth="2"/>
                )}
              </svg>
              
              {hasUnread && (
                <span style={{ 
                  fontSize: 12, 
                  fontWeight: 500, 
                  color: palette.textSecondary,
                  letterSpacing: '0.2px',
                }}>
                  {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
                </span>
              )}
            </button>

            {/* Dropdown notifications - Design épuré */}
            {isNotifOpen && (
              <div style={{
                position: 'absolute',
                top: 44,
                right: 0,
                width: 360,
                maxHeight: 400,
                background: palette.white,
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                border: `1px solid ${palette.border}`,
                zIndex: 1000,
                overflow: 'hidden',
              }}>
                {/* En-tête */}
                <div style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${palette.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: palette.textPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}>
                    Derniers dépôts
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        fontSize: 11,
                        color: palette.textMuted,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = palette.info}
                      onMouseLeave={e => e.currentTarget.style.color = palette.textMuted}
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                
                {/* Liste des notifications */}
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {unreadNotifications.length === 0 ? (
                    <div style={{ 
                      padding: '48px 20px', 
                      textAlign: 'center', 
                      color: palette.textMuted,
                      fontSize: 13,
                    }}>
                      <div style={{ marginBottom: 8, opacity: 0.5 }}>○</div>
                      Aucune nouvelle notification
                    </div>
                  ) : (
                    unreadNotifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '14px 18px',
                          borderBottom: `1px solid ${palette.border}`,
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = palette.bg}
                        onMouseLeave={e => e.currentTarget.style.background = palette.white}
                      >
                        <div style={{ display: 'flex', gap: 12 }}>
                          {/* Point indicateur non lu */}
                          <div style={{
                            width: 6,
                            height: 6,
                            background: palette.info,
                            borderRadius: '50%',
                            marginTop: 6,
                            flexShrink: 0,
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: 13, 
                              fontWeight: 500, 
                              color: palette.textPrimary,
                              marginBottom: 4,
                            }}>
                              {notif.title.replace('📋 ', '')}
                            </div>
                            <div style={{ 
                              fontSize: 12, 
                              color: palette.textSecondary,
                              lineHeight: 1.4,
                              marginBottom: 6,
                            }}>
                              {notif.message}
                            </div>
                            <div style={{ 
                              fontSize: 10, 
                              color: palette.textMuted,
                            }}>
                              {formatTime(notif.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPIs ligne 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <ColorKpiCard label="À TRAITER" value={stats.totalSoumis} sub="dossiers SOUMIS" color={palette.warning} />
          <ColorKpiCard label="APPROUVÉS" value={stats.totalApprouves} sub={`taux ${stats.tauxApprobation}%`} color={palette.success} />
          <ColorKpiCard label="REJETÉS" value={stats.totalRejetes} sub={`taux ${stats.tauxRejet}%`} color={palette.danger} />
          <ColorKpiCard label="TOTAL DOSSIERS" value={total} sub="avec contrat" color={palette.info} />
        </div>

        {/* KPIs ligne 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
          <ColorKpiCard label="FLUX MANUEL" value={stats.totalManual} sub="saisie manuelle" color={palette.info} />
          <ColorKpiCard label="FLUX E-HOUWIYA" value={stats.totalEhouwiya} sub="identité numérique" color={palette.success} />
          <ColorKpiCard label="CONTRATS SIGNÉS" value={stats.totalContratsSigenes} sub="via TunTrust" color={palette.gold} />
          <ColorKpiCard label="SOUMIS AUJOURD'HUI" value={stats.dossiersAujourdHui} sub="nouvelles demandes" color={palette.warning} />
        </div>

        {/* Graphiques */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 18, marginBottom: 28 }}>
          <ChartCard title="Volume des 7 derniers jours">
            <div style={{ height: 250 }}><Bar data={barData} options={barOpts} redraw={false} /></div>
          </ChartCard>
          <ChartCard title="Flux d'identification">
            <div style={{ height: 210 }}><Doughnut data={doughnutFlux} options={donutOpts} redraw={false} /></div>
          </ChartCard>
          <ChartCard title="Répartition par statut">
            <div style={{ height: 210 }}><Doughnut data={doughnutStatut} options={donutOpts} redraw={false} /></div>
          </ChartCard>
        </div>

        {/* Action rapide */}
        {stats.totalSoumis > 0 && (
          <ActionCard
            count={stats.totalSoumis}
            onClick={() => navigate('/dossiers?status=SUBMITTED')}
            color={palette.warning}
          />
        )}
      </div>
    </Layout>
  );
};

// ============================================================
// ColorKpiCard
// ============================================================
const ColorKpiCard: React.FC<{
  label: string;
  value: number | string;
  sub: string;
  color: string;
}> = ({ label, value, sub, color }) => (
  <div
    style={{
      background: palette.white,
      borderRadius: 12,
      padding: '12px 16px',
      border: `1px solid ${palette.border}`,
      borderLeft: `3px solid ${color}`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ fontSize: 10, fontWeight: 600, color: color, letterSpacing: '0.4px', marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 500, color: palette.textPrimary, letterSpacing: '-0.3px', marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 9, color: palette.textMuted, letterSpacing: '0.2px' }}>{sub}</div>
  </div>
);

// ============================================================
// ChartCard
// ============================================================
const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    style={{
      background: palette.white,
      borderRadius: 12,
      padding: '14px 18px',
      border: `1px solid ${palette.border}`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <h3 style={{ fontSize: 10, fontWeight: 600, color: palette.textMuted, letterSpacing: '0.4px', textTransform: 'uppercase', margin: '0 0 14px' }}>{title}</h3>
    {children}
  </div>
);

// ============================================================
// ActionCard
// ============================================================
const ActionCard: React.FC<{ count: number; onClick: () => void; color: string }> = ({ count, onClick, color }) => (
  <div
    onClick={onClick}
    style={{
      background: palette.white,
      borderRadius: 12,
      padding: '12px 20px',
      border: `1px solid ${palette.border}`,
      borderLeft: `3px solid ${color}`,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.transform = 'translateX(3px)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = palette.white; e.currentTarget.style.transform = 'translateX(0)'; }}
  >
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: color }}>{count} dossier{count > 1 ? 's' : ''} en attente</div>
      <div style={{ fontSize: 10, color: palette.textMuted, marginTop: 2 }}>Cliquez pour traiter</div>
    </div>
    <span style={{ fontSize: 16, color: color, opacity: 0.6, transition: 'transform 0.2s' }}>→</span>
  </div>
);
