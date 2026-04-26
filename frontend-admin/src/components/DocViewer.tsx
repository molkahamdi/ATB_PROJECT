// src/components/DocViewer.tsx
// ============================================================
//  Composant pour afficher les documents justificatifs
//
//  Problème résolu :
//  ─────────────────
//  Les images sont servies par un endpoint protégé (JWT).
//  On ne peut pas faire <img src="..."> directement car
//  le navigateur ne peut pas envoyer le header Authorization.
//
//  Solution :
//  ──────────
//  1. fetch() avec header Authorization → obtient le binaire
//  2. Créer un Blob URL local → l'afficher dans <img>
//  3. Révoquer le Blob URL au démontage (évite les fuites mémoire)
// ============================================================
import React, { useEffect, useState } from 'react';
import { getDocumentUrl } from '../services/adminApi';

interface DocViewerProps {
  customerId: string;
  docType:    'cinFront' | 'cinBack' | 'passport';
  label:      string;
}

export const DocViewer: React.FC<DocViewerProps> = ({ customerId, docType, label }) => {
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);

    const token = localStorage.getItem('admin_token');
    fetch(getDocumentUrl(customerId, docType), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    // Nettoyage au démontage
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [customerId, docType]);

  return (
    <>
      {/* Visionneuse agrandie */}
      {enlarged && blobUrl && (
        <div
          onClick={() => setEnlarged(false)}
          style={{
            position:        'fixed' as const,
            inset:           0,
            background:      'rgba(0,0,0,0.85)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            zIndex:          1000,
            cursor:          'zoom-out',
            padding:         24,
          }}
        >
          <img
            src={blobUrl}
            alt={label}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
          />
          <div style={{ position: 'absolute', top: 16, right: 20, color: '#fff', fontSize: 28, cursor: 'pointer' }}>✕</div>
        </div>
      )}

      <div style={{ textAlign: 'center' as const }}>
        {/* Zone image */}
        <div
          onClick={() => !error && blobUrl && setEnlarged(true)}
          style={{
            width:        '100%',
            aspectRatio:  '1.6',
            background:   loading ? '#f3f4f6' : error ? '#fef2f2' : '#f0fdf4',
            border:       `2px solid ${loading ? '#e5e7eb' : error ? '#fca5a5' : '#86efac'}`,
            borderRadius: 10,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            overflow:     'hidden',
            cursor:       blobUrl && !error ? 'zoom-in' : 'default',
            marginBottom: 8,
            position:     'relative' as const,
          }}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #e5e7eb', borderTop: '2px solid #c82333', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Chargement...</span>
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: 'center' as const, padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Document non disponible</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Fichier introuvable sur le serveur</div>
            </div>
          )}
          {!loading && !error && blobUrl && (
            <>
              <img
                src={blobUrl}
                alt={label}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Badge zoom */}
              <div style={{
                position:   'absolute',
                bottom:     6,
                right:      6,
                background: 'rgba(0,0,0,0.55)',
                color:      '#fff',
                borderRadius: 4,
                padding:    '2px 6px',
                fontSize:   10,
                fontWeight: 600,
              }}>
                🔍 Agrandir
              </div>
            </>
          )}
        </div>

        {/* Label */}
        <div style={{ fontSize: 12, fontWeight: 600, color: error ? '#b91c1c' : '#374151' }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: error ? '#f87171' : '#6b7280', marginTop: 2 }}>
          {loading ? 'Chargement…' : error ? 'Indisponible' : '✓ Uploadé — cliquer pour agrandir'}
        </div>
      </div>
    </>
  );
};