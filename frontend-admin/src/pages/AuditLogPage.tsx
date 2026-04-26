// src/pages/AuditLogPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Layout }  from '../components/Layout';
import { Spinner } from '../components/ui';
import { getAuditLogs, type AuditLogEntry } from '../services/adminApi';

const palette = {
  bg: '#f5f7fc', white: '#ffffff', border: '#e8ecf2',
  textPrimary: '#1a2c3e', textSecondary: '#5b6e8c', textMuted: '#8a9bb0',
  warning: '#c47b2e', success: '#278a5c', danger: '#b33a2c',
  info: '#2266a8', gold: '#9e7f4c',
};

const ACTION_META: Record<string, { label: string; color: string }> = {
  LOGIN:           { label: 'Connexion',           color: palette.info    },
  LOGOUT:          { label: 'Déconnexion',          color: palette.textMuted },
  APPROVE_DOSSIER: { label: 'Approbation',          color: palette.success },
  REJECT_DOSSIER:  { label: 'Rejet',                color: palette.danger  },
  VIEW_DOSSIER:    { label: 'Consultation dossier', color: palette.gold    },
  VIEW_STATS:      { label: 'Tableau de bord',      color: palette.textSecondary },
};

const ACTIONS = Object.keys(ACTION_META);
const LIMIT   = 30;

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs]             = useState<AuditLogEntry[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filterAction,   setFilterAction]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAuditLogs({
        page:     p,
        limit:    LIMIT,
        action:   filterAction   || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo:   filterDateTo   || undefined,
      });
      setLogs(res.data);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('fr-TN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  // ✅ Détails enrichis : motif rejet affiché clairement
  const formatDetails = (log: AuditLogEntry): string => {
    if (!log.metadata) return '';
    const m = log.metadata;
    if (log.action === 'APPROVE_DOSSIER')
      return `Compte créé : ${m.accountNumber ?? '—'}`;
    if (log.action === 'REJECT_DOSSIER')
      return m.reason ? `Motif : ${m.reason}` : '—';
    if (log.action === 'VIEW_DOSSIER')
      return m.cin ? `CIN : ${m.cin}` : '';
    if (log.action === 'LOGIN' && !log.success)
      return log.errorMessage ?? '';
    return '';
  };

  return (
    <Layout>
      <div style={{ background: palette.bg, minHeight: '100vh', padding: '28px 32px' }}>

        {/* En-tête */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 500, color: palette.textPrimary,
            margin: '0 0 4px', letterSpacing: '-0.3px',
          }}>
            Journal d'audit
          </h1>
          <p style={{ fontSize: 13, color: palette.textSecondary, margin: 0 }}>
            {total} action{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtres */}
        <div style={{
          background: palette.white, borderRadius: 12,
          padding: '16px 20px', border: `1px solid ${palette.border}`,
          marginBottom: 20, display: 'flex', gap: 16,
          alignItems: 'flex-end', flexWrap: 'wrap',
        }}>
          <FilterField label="Action">
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              style={selectStyle}
            >
              <option value="">Toutes les actions</option>
              {ACTIONS.map(a => (
                <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Du">
            <input type="date" value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              style={inputStyle} />
          </FilterField>

          <FilterField label="Au">
            <input type="date" value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              style={inputStyle} />
          </FilterField>

          {(filterAction || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setFilterAction(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              style={{
                fontSize: 12, color: palette.textMuted, background: 'transparent',
                border: 'none', cursor: 'pointer', padding: '7px 0',
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Tableau */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spinner size={32} />
          </div>
        ) : error ? (
          <div style={{ padding: 40, color: palette.danger }}>{error}</div>
        ) : (
          <div style={{
            background: palette.white, borderRadius: 12,
            border: `1px solid ${palette.border}`, overflow: 'hidden',
          }}>
            {/* Header — ✅ 5 colonnes, sans IP */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '170px 130px 160px 160px 1fr',
              padding: '10px 20px',
              borderBottom: `1px solid ${palette.border}`,
              background: palette.bg,
            }}>
              {['Date / Heure', 'Admin', 'Action', 'Client', 'Détails'].map(h => (
                <span key={h} style={{
                  fontSize: 10, fontWeight: 600, color: palette.textMuted,
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {logs.length === 0 ? (
              <div style={{
                padding: '48px 20px', textAlign: 'center',
                color: palette.textMuted, fontSize: 13,
              }}>
                Aucune entrée d'audit
              </div>
            ) : logs.map((log, i) => {
              const meta   = ACTION_META[log.action];
              const isLast = i === logs.length - 1;
              const details = formatDetails(log);

              return (
                <div
                  key={log.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '170px 130px 160px 160px 1fr',
                    padding: '13px 20px',
                    borderBottom: isLast ? 'none' : `1px solid ${palette.border}`,
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = palette.bg}
                  onMouseLeave={e => e.currentTarget.style.background = palette.white}
                >
                  {/* Date */}
                  <span style={{
                    fontSize: 12, color: palette.textSecondary,
                    fontFamily: 'monospace', letterSpacing: '-0.2px',
                  }}>
                    {formatDate(log.createdAt)}
                  </span>

                  {/* Admin */}
                  <span style={{
                    fontSize: 13, color: palette.textPrimary, fontWeight: 500,
                  }}>
                    {log.adminUsername}
                  </span>

                  {/* Badge action */}
                  <div>
                    <span style={{
                      display: 'inline-block', fontSize: 10, fontWeight: 600,
                      color:       log.success
                        ? (meta?.color ?? palette.textMuted)
                        : palette.danger,
                      background: `${log.success
                        ? (meta?.color ?? palette.textMuted)
                        : palette.danger}15`,
                      padding: '4px 10px', borderRadius: 20,
                      letterSpacing: '0.3px', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>
                      {log.success
                        ? (meta?.label ?? log.action)
                        : `✗ ${meta?.label ?? log.action}`}
                    </span>
                  </div>

                  {/* Client */}
                  <span style={{ fontSize: 13, color: palette.textSecondary }}>
                    {log.customerName ?? '—'}
                  </span>

                  {/* ✅ Détails — motif rejet mis en valeur */}
                  {log.action === 'REJECT_DOSSIER' && details ? (
                    <span style={{
                      fontSize: 12,
                      color: palette.danger,
                      fontStyle: 'italic',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {details}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 12, color: palette.textMuted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {details || '—'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <PBtn label="←" disabled={page <= 1}        onClick={() => fetchLogs(page - 1)} />
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4              ? i + 1
                      : page >= totalPages - 3 ? totalPages - 6 + i
                      : page - 3 + i;
              return p >= 1 && p <= totalPages
                ? <PBtn key={p} label={String(p)} active={p === page} onClick={() => fetchLogs(p)} />
                : null;
            })}
            <PBtn label="→" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)} />
          </div>
        )}
      </div>
    </Layout>
  );
};

// ── Sous-composants ────────────────────────────────────────
const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{
      fontSize: 10, color: palette.textMuted,
      textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6,
    }}>
      {label}
    </div>
    {children}
  </div>
);

const PBtn: React.FC<{
  label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}> = ({ label, active, disabled, onClick }) => (
  <button
    onClick={onClick} disabled={disabled}
    style={{
      width: 32, height: 32, borderRadius: 8, fontSize: 12,
      fontWeight: active ? 600 : 400,
      background: active ? palette.info : palette.white,
      color:      active ? palette.white : disabled ? palette.textMuted : palette.textPrimary,
      border:     `1px solid ${active ? palette.info : palette.border}`,
      cursor:     disabled ? 'not-allowed' : 'pointer',
      opacity:    disabled ? 0.5 : 1,
      transition: 'all 0.15s',
    }}
  >
    {label}
  </button>
);

const selectStyle: React.CSSProperties = {
  fontSize: 13, color: '#1a2c3e', background: '#f5f7fc',
  border: '1px solid #e8ecf2', borderRadius: 8,
  padding: '7px 12px', outline: 'none', cursor: 'pointer', minWidth: 180,
};

const inputStyle: React.CSSProperties = {
  fontSize: 13, color: '#1a2c3e', background: '#f5f7fc',
  border: '1px solid #e8ecf2', borderRadius: 8,
  padding: '7px 12px', outline: 'none',
};