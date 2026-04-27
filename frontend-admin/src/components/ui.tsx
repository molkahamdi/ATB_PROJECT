

import React from 'react';

const palette = {
  success:      '#278a5c',
  successLight: '#eaf5ef',
  danger:       '#b33a2c',
  dangerLight:  '#fef1f0',
  warning:      '#c47b2e',
  warningLight: '#fef5e8',
  info:         '#2266a8',
  infoLight:    '#eef3fc',
  neutral:      '#5f6c84',
  neutralLight: '#f0f2f5',
  muted:        '#8a97ae',
  mutedLight:   '#f7f8fa',
  border:       '#eef1f5',
  textPrimary:  '#1a2533',
  textSecondary: '#5f6c84',
  white:        '#ffffff',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:             { label: 'Brouillon',      color: palette.neutral, bg: palette.neutralLight },
  PENDING_OTP:       { label: 'Attente OTP',    color: palette.info,     bg: palette.infoLight },
  FATCA_PENDING:     { label: 'Attente FATCA',  color: palette.warning,  bg: palette.warningLight },
  DOCUMENTS_PENDING: { label: 'Attente docs',   color: palette.warning,  bg: palette.warningLight },
  PERSONAL_PENDING:  { label: 'Données perso',  color: palette.info,     bg: palette.infoLight },
  SUBMITTED:         { label: 'Soumis',         color: palette.warning,  bg: palette.warningLight },
  APPROVED:          { label: 'Approuvé',       color: palette.success,  bg: palette.successLight },
  REJECTED:          { label: 'Rejeté',         color: palette.danger,   bg: palette.dangerLight },
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] || { label: status, color: palette.neutral, bg: palette.mutedLight };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 30,
        padding: '4px 12px',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap' as const,
        display: 'inline-block',
        lineHeight: 1.4,
      }}
    >
      {cfg.label}
    </span>
  );
};

// ── Source badge (sans icônes, épuré) ───────────────────────────
export const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const isE = source === 'E_HOUWIYA';
  return (
    <span
      style={{
        background: isE ? palette.successLight : palette.infoLight,
        color: isE ? palette.success : palette.info,
        borderRadius: 30,
        padding: '3px 10px',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.2px',
        display: 'inline-block',
        lineHeight: 1.4,
      }}
    >
      {isE ? 'E-Houwiya' : 'Manuel'}
    </span>
  );
};

// ── Spinner élégant ────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div
    style={{
      width: size,
      height: size,
      border: `2px solid ${palette.mutedLight}`,
      borderTop: `2px solid ${palette.info}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}
  />
);

// Injection de l'animation spin (une seule fois)
if (typeof document !== 'undefined' && !document.querySelector('#spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spin-keyframes';
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

// ── KPI Card raffinée ───────────────────────────────────────────────
export const KpiCard: React.FC<{
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}> = ({ label, value, sub }) => (
  <div
    style={{
      background: palette.white,
      borderRadius: 16,
      padding: '20px 24px',
      border: `1px solid ${palette.border}`,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: palette.muted,
        letterSpacing: '0.3px',
        textTransform: 'uppercase' as const,
        marginBottom: 12,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 32,
        fontWeight: 500,
        color: palette.textPrimary,
        letterSpacing: '-0.5px',
        marginBottom: 4,
      }}
    >
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: palette.muted }}>{sub}</div>}
  </div>
);

// ── InfoRow raffinée ────────────────────────────────────────────────
export const InfoRow: React.FC<{ label: string; value?: string | number | boolean | null }> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: `1px solid ${palette.border}`,
        fontSize: 13,
        gap: 16,
      }}
    >
      <span style={{ color: palette.textSecondary, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          color: palette.textPrimary,
          textAlign: 'right' as const,
        }}
      >
        {display}
      </span>
    </div>
  );
};

// ── Card section raffinée ───────────────────────────────────────────
export const Card: React.FC<{
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ title, children, right }) => (
  <div
    style={{
      background: palette.white,
      borderRadius: 16,
      marginBottom: 20,
      overflow: 'hidden',
      border: `1px solid ${palette.border}`,
    }}
  >
    <div
      style={{
        padding: '14px 22px',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 600,
          color: palette.muted,
          letterSpacing: '0.4px',
          textTransform: 'uppercase' as const,
        }}
      >
        {title}
      </h3>
      {right}
    </div>
    <div style={{ padding: '18px 22px' }}>{children}</div>
  </div>
);

// ── Document thumbnail raffiné ─────────────────────────────────────
export const DocThumb: React.FC<{
  label: string;
  path: string | null;
  exists: boolean;
}> = ({ label, path, exists }) => (
  <div style={{ textAlign: 'center' as const }}>
    <div
      style={{
        width: '100%',
        aspectRatio: '1.6',
        background: exists ? palette.successLight : palette.dangerLight,
        border: `1px solid ${exists ? palette.success : palette.danger}`,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        overflow: 'hidden',
      }}
    >
      {exists && path ? (
        <img
          src={`http://localhost:3000/${path.replace(/\\/g, '/')}`}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span style={{ fontSize: 24, color: exists ? palette.success : palette.danger }}>
          {exists ? '✓' : '✗'}
        </span>
      )}
    </div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: exists ? palette.success : palette.danger,
        marginBottom: 2,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 10, color: palette.muted }}>{exists ? 'Présent' : 'Manquant'}</div>
  </div>
);