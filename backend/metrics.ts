// backend/src/metrics.ts
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

export const register = new Registry();

// Métriques système automatiques (CPU, mémoire, event loop)
collectDefaultMetrics({ register });

// Compteur de requêtes HTTP
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

// Durée des requêtes HTTP
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});