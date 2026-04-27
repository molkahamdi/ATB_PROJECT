
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/adminApi';
import { useAuthStore } from '../services/authStore';


const palette = {
  primary:    '#0a2b3e',     
  accent:     '#313c6d', 
  white:      '#ffffffe0',
  textMain:   '#1e2a36',
  textSub:    '#5a6b7a',
  textLight:  '#8a9aaa',
  borderLight:'#e2ddd4',
  danger:     '#b33a2c',
  dangerBg:   '#fef5f4',
};


const videoUrl = '/videos/bankemployee.mp4';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login    = useAuthStore(s => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      login(res.token, res.admin);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%',
      background: `linear-gradient(135deg, #f0ede8 0%, #e8e4dd 100%)`,
      display: 'flex', 
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      
      {/* Partie gauche : Formulaire */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(0px)',
      }}>
        
        <div style={{ 
          maxWidth: 440,
          width: '100%',
        }}>
          
          {/* Titre */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ 
              fontSize: 32, 
              fontWeight: 500, 
              color: palette.textMain, 
              margin: '0 0 12px',
              letterSpacing: '-0.5px',
            }}>
              Connexion
            </h1>
            <p style={{ 
              fontSize: 15, 
              color: palette.textSub, 
              margin: 0,
              lineHeight: 1.4,
            }}>
              Accédez au tableau de bord administrateur ATBDigipack
            </p>
            <div style={{
              width: 50,
              height: 2,
              background: palette.accent,
              marginTop: 20,
            }} />
          </div>

          {/* Message d'erreur */}
          {error && (
            <div style={{ 
              background: palette.dangerBg, 
              borderLeft: `3px solid ${palette.danger}`, 
              borderRadius: 8, 
              padding: '12px 16px', 
              marginBottom: 28, 
              fontSize: 13, 
              color: palette.danger,
            }}>
              {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: palette.textSub, 
                marginBottom: 8,
              }}>
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Votre nom d'utilisateur"
                required
                style={{ 
                  width: '100%', 
                  height: 52, 
                  border: 'none',
                  borderBottom: `2px solid ${palette.borderLight}`,
                  padding: '0 0 8px 0',
                  fontSize: 16, 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  background: 'transparent',
                  transition: 'all 0.2s',
                  color: palette.textMain,
                }}
                onFocus={e => {
                  e.currentTarget.style.borderBottomColor = palette.primary;
                }}
                onBlur={e => {
                  if (!e.currentTarget.value) {
                    e.currentTarget.style.borderBottomColor = palette.borderLight;
                  }
                }}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                fontWeight: 500, 
                color: palette.textSub, 
                marginBottom: 8,
              }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: '100%', 
                  height: 52, 
                  border: 'none',
                  borderBottom: `2px solid ${palette.borderLight}`,
                  padding: '0 0 8px 0',
                  fontSize: 16, 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  background: 'transparent',
                  transition: 'all 0.2s',
                  color: palette.textMain,
                }}
                onFocus={e => {
                  e.currentTarget.style.borderBottomColor = palette.primary;
                }}
                onBlur={e => {
                  if (!e.currentTarget.value) {
                    e.currentTarget.style.borderBottomColor = palette.borderLight;
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', 
                height: 52, 
                background: loading ? palette.borderLight : palette.primary,
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 500, 
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.5px',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = '#0e3a52';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = palette.primary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ 
            marginTop: 48, 
            textAlign: 'center',
          }}>
            <p style={{ 
              fontSize: 11, 
              color: palette.textLight, 
              margin: 0,
              letterSpacing: '0.3px',
            }}>
              Arab Tunisian Bank · DigiPack Administration
            </p>
            <p style={{ 
              fontSize: 10, 
              color: '#b8a99a', 
              margin: '8px 0 0',
            }}>
              Accès sécurisé
            </p>
          </div>
        </div>
      </div>

      {/* Partie droite : Vidéo en pleine hauteur */}
      <div style={{ 
        flex: 1,
        background: palette.primary,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        >
          <source src={videoUrl} type="video/mp4" />
          {/* Fallback si la vidéo ne charge pas */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#fff',
            textAlign: 'center',
            padding: '40px',
            background: palette.primary,
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏦</div>
            <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>ATB DigiPack</div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>Administration panel</div>
          </div>
        </video>
        
        {/* Overlay text subtil (conservé exactement comme avant) */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: '20px',
        }}>
          <p style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: 400,
            margin: 0,
            letterSpacing: '0.3px',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}>
            Tableau de bord administrateur
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            margin: '6px 0 0',
          }}>
            Gestion des dossiers d'ouverture de compte
          </p>
        </div>
      </div>
    </div>
  );
};