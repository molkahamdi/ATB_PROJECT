
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDossiers, type DossierSummary } from '../services/adminApi';
import { StatusBadge, SourceBadge, Spinner } from '../components/ui';
import { Layout } from '../components/Layout';

const STATUS_OPTS = [
  { value: '',          label: 'Tous les statuts' },
  { value: 'SUBMITTED', label: 'Soumis' },
  { value: 'APPROVED',  label: 'Approuvés' },
  { value: 'REJECTED',  label: 'Rejetés' },
];

export const DossiersPage: React.FC = () => {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();

  const [rows,       setRows]       = useState<DossierSummary[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);

  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState(searchParams.get('status') || '');
  const [source,    setSource]    = useState('');
  const [page,      setPage]      = useState(1);
  const [sortBy,    setSortBy]    = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDossiers({ search, status, source, page, limit: 20, sortBy, sortOrder });
      setRows(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, status, source, page, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(o => o === 'DESC' ? 'ASC' : 'DESC');
    else { setSortBy(field); setSortOrder('DESC'); }
    setPage(1);
  };

  return (
    <Layout>
      <div style={{ padding: '28px 32px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>

        {/* En-tête */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 500, color: '#1a1f36', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Dossiers clients
          </h1>
          <p style={{ fontSize: 13, color: '#5b677b', margin: 0 }}>
            {total} dossier{total > 1 ? 's' : ''} — contrats générés
          </p>
        </div>

        {/* Barre de filtres - sans bouton Appliquer */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          padding: '12px 20px',
          borderRadius: 12,
          border: '1px solid #e4e7ec',
        }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <input
              type="text"
              placeholder="Rechercher par CIN, nom ou email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              onKeyDown={e => e.key === 'Enter' && load()}
              style={{
                width: '100%',
                height: 38,
                padding: '0 14px',
                border: '1px solid #d0d5dd',
                borderRadius: 8,
                fontSize: 13,
                background: '#fff',
                outline: 'none',
                transition: 'all 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#2c5f8a'}
              onBlur={e => e.currentTarget.style.borderColor = '#d0d5dd'}
            />
          </div>
          <div style={{ width: 160 }}>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px',
                border: '1px solid #d0d5dd',
                borderRadius: 8,
                fontSize: 13,
                background: '#fff',
                outline: 'none',
              }}
            >
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ width: 140 }}>
            <select
              value={source}
              onChange={e => { setSource(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px',
                border: '1px solid #d0d5dd',
                borderRadius: 8,
                fontSize: 13,
                background: '#fff',
                outline: 'none',
              }}
            >
              <option value="">Tous les flux</option>
              <option value="MANUAL">Manuel</option>
              <option value="E_HOUWIYA">E-Houwiya</option>
            </select>
          </div>
          <button
            onClick={load}
            style={{
              height: 38,
              padding: '0 22px',
              background: '#2c5f8a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4668'}
            onMouseLeave={e => e.currentTarget.style.background = '#2c5f8a'}
          >
            Actualiser
          </button>
        </div>

        {/* Tableau */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80, background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec' }}>
            <Spinner size={32} />
          </div>
        ) : (
          <>
            <div style={{
              background: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #e4e7ec',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fc', borderBottom: '1px solid #e4e7ec' }}>
                    <Th label="Client" field="lastName" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th label="CIN" field="idCardNumber" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th label="Flux" />
                    <Th label="Statut" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th label="Documents" />
                    <Th label="Contrat" />
                    <Th label="Soumis le" field="submittedAt" sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
                    <Th label="" />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px', color: '#8c98ae' }}>
                        Aucun dossier trouvé
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/dossiers/${r.id}`)}
                        style={{
                          borderBottom: '1px solid #eff1f4',
                          background: idx % 2 === 0 ? '#fff' : '#fcfcfd',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4f9'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fcfcfd'}
                      >
                        <td style={TD}>
                          <div style={{ fontWeight: 500, color: '#1a1f36' }}>{r.firstName} {r.lastName}</div>
                          <div style={{ fontSize: 11, color: '#8c98ae', marginTop: 2 }}>{r.email}</div>
                        </td>
                        <td style={TD}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#3c4b64' }}>{r.idCardNumber}</span>
                        </td>
                        <td style={TD}><SourceBadge source={r.identificationSource} /></td>
                        <td style={TD}><StatusBadge status={r.status} /></td>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {r.usePassport ? (
                              <DocStatus ok={r.hasPassport} label="Passeport" />
                            ) : (
                              <>
                                <DocStatus ok={r.hasIdCardFront} label="Recto" />
                                <DocStatus ok={r.hasIdCardBack} label="Verso" />
                              </>
                            )}
                          </div>
                        </td>
                        <td style={TD}>
                          <ContractStatus signed={r.isContractSigned} />
                        </td>
                        <td style={TD}>
                          <div style={{ fontSize: 12, color: '#3c4b64' }}>
                            {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('fr-TN') : '—'}
                          </div>
                          <div style={{ fontSize: 11, color: '#8c98ae', marginTop: 2 }}>
                            {r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td style={TD} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/dossiers/${r.id}`)}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#2c5f8a',
                              background: 'transparent',
                              border: '1px solid #d0d5dd',
                              borderRadius: 6,
                              padding: '5px 14px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#2c5f8a';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.borderColor = '#2c5f8a';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#2c5f8a';
                              e.currentTarget.style.borderColor = '#d0d5dd';
                            }}
                          >
                            Consulter
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 24,
              }}>
                <PaginationButton
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Précédent
                </PaginationButton>
                <span style={{ fontSize: 13, color: '#5b677b' }}>
                  Page <span style={{ fontWeight: 600, color: '#1a1f36' }}>{page}</span> sur {totalPages}
                </span>
                <PaginationButton
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Suivant
                </PaginationButton>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

// ============================================================
// Composants internes sobres
// ============================================================

const Th: React.FC<{
  label: string;
  field?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  onSort?: (field: string) => void;
}> = ({ label, field, sortBy, sortOrder, onSort }) => (
  <th
    onClick={() => field && onSort && onSort(field)}
    style={{
      padding: '14px 16px',
      textAlign: 'left',
      fontWeight: 600,
      fontSize: 12,
      color: '#5b677b',
      cursor: field ? 'pointer' : 'default',
      whiteSpace: 'nowrap',
      borderBottom: '1px solid #e4e7ec',
      userSelect: 'none',
      letterSpacing: '0.3px',
      textTransform: 'uppercase' as const,
    }}
  >
    {label}
    {field && sortBy === field && (
      <span style={{ marginLeft: 6, color: '#2c5f8a', fontSize: 11 }}>
        {sortOrder === 'DESC' ? '↓' : '↑'}
      </span>
    )}
  </th>
);

const TD: React.CSSProperties = {
  padding: '14px 16px',
  verticalAlign: 'middle',
};

const DocStatus: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span
    title={label}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 60,
      padding: '3px 0',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.3px',
      background: ok ? '#e8f3ed' : '#fef1f0',
      color: ok ? '#1e7b4a' : '#b91c2c',
      border: ok ? 'none' : 'none',
    }}
  >
    {ok ? '✓ ' + label : '✗ ' + label}
  </span>
);

const ContractStatus: React.FC<{ signed: boolean }> = ({ signed }) => (
  <span
    style={{
      fontSize: 11,
      fontWeight: 500,
      padding: '3px 10px',
      borderRadius: 20,
      background: signed ? '#e8f3ed' : '#f0f2f5',
      color: signed ? '#1e7b4a' : '#6c7a91',
    }}
  >
    {signed ? 'Signé' : 'Non signé'}
  </span>
);

const PaginationButton: React.FC<{
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ disabled, onClick, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      height: 34,
      padding: '0 18px',
      border: '1px solid #d0d5dd',
      borderRadius: 6,
      background: disabled ? '#f8f9fc' : '#fff',
      color: disabled ? '#b0bbcd' : '#5b677b',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 12,
      fontWeight: 500,
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = '#2c5f8a';
        e.currentTarget.style.color = '#2c5f8a';
      }
    }}
    onMouseLeave={e => {
      if (!disabled) {
        e.currentTarget.style.borderColor = '#d0d5dd';
        e.currentTarget.style.color = '#5b677b';
      }
    }}
  >
    {children}
  </button>
);