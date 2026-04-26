// src/components/Layout.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';

// Palette raffinée (identique au code 1)
const palette = {
  bgSidebar:      '#0f172a',
  bgMain:         '#f7f8fa',
  textSidebar:    '#94a3b8',
  textSidebarActive: '#ffffff',
  accent:         '#2266a8',
  gold:           '#a87c3c',
  danger:         '#b33a2c',
};

// Navigation (code 2 : sans Audit log, avec icônes)
const NAV = [
  { path: '/dashboard', label: 'Tableau de bord' },
  { path: '/dossiers',  label: 'Total Dossiers' },
   { path: '/audit',     label: 'Journal d\'audit' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuthStore();

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      background: palette.bgMain, 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif' 
    }}>
      
      <aside style={{
        width: 260,
        background: palette.bgSidebar,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        
        {/* Logo ATB - design raffiné code 1 */}
        <div style={{ 
          padding: '28px 20px 24px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              overflow: 'hidden',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <img
                src="/src/assets/atb-logo.png"
                alt="ATB"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div style={{ 
                color: '#f1f5f9', 
                fontWeight: 500, 
                fontSize: 14, 
                letterSpacing: '0.2px',
                lineHeight: 1.3,
              }}>
                DigiPack
              </div>
              <div style={{ 
                color: '#5b6e8c', 
                fontSize: 10, 
                letterSpacing: '0.3px',
                fontWeight: 400,
              }}>
                Administration
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - style raffiné code 1 + icônes code 2 */}
        <nav style={{ flex: 1, padding: '20px 12px' }}>
          {NAV.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: active ? palette.textSidebarActive : palette.textSidebar,
                  fontWeight: active ? 500 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 4,
                  transition: 'all 0.15s',
                  letterSpacing: '0.2px',
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                
                {item.label}
                {active && (
                  <span style={{
                    float: 'right',
                    fontSize: 10,
                    color: palette.gold,
                    opacity: 0.5,
                    marginLeft: 'auto',
                  }}>
                    —
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profil - design raffiné code 1 */}
        <div style={{ padding: '20px 20px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
              {admin?.fullName || 'Administrateur'}
            </div>
            <div style={{ color: '#5b6e8c', fontSize: 11, fontWeight: 400 }}>
              Administrateur
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: palette.danger,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              opacity: 0.7,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
};