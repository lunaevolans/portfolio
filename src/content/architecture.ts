/**
 * Data for the ~/architecture app. Two graphs: a flagship system design and a
 * "skill topology". Tiers become horizontal lanes in the force layout.
 * TODO: redraw this with a system you actually designed.
 */

export type NodeKind = 'client' | 'edge' | 'service' | 'stream' | 'data' | 'ml' | 'obs';

export interface ArchNode {
  id: string;
  label: string;
  kind: NodeKind;
  tier: number;
  tech: string[];
  blurb: string;
  decisions: string[];
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
  /** Async (message) edges animate differently from sync (RPC) edges. */
  async?: boolean;
}

export interface ArchGraph {
  id: string;
  title: string;
  subtitle: string;
  tiers: string[];
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export const systemGraph: ArchGraph = {
  id: 'system',
  title: 'Helios: commerce event platform',
  subtitle: 'Request path (solid) and event path (dashed). Click a node for design decisions.',
  tiers: ['clients', 'edge', 'services', 'backbone', 'storage', 'intelligence'],
  nodes: [
    {
      id: 'web',
      label: 'Web app',
      kind: 'client',
      tier: 0,
      tech: ['TypeScript', 'React', 'Astro'],
      blurb: 'Islands-architecture front-end served from the CDN.',
      decisions: [
        'Static-first HTML for SEO and time to first paint; interactivity is hydrated per island.',
        'Typed API client generated from the same schema the gateway validates against.',
      ],
    },
    {
      id: 'mobile',
      label: 'Mobile',
      kind: 'client',
      tier: 0,
      tech: ['React Native'],
      blurb: 'Offline-first with a local event queue.',
      decisions: ['Client-generated idempotency keys make retries after reconnect safe.'],
    },
    {
      id: 'partners',
      label: 'Partner APIs',
      kind: 'client',
      tier: 0,
      tech: ['REST', 'Webhooks'],
      blurb: 'B2B integrations with signed webhooks.',
      decisions: ['HMAC-signed webhooks with replay windows and a per-partner retry budget.'],
    },
    {
      id: 'cdn',
      label: 'CDN / WAF',
      kind: 'edge',
      tier: 1,
      tech: ['Cloudflare'],
      blurb: 'TLS termination, caching, bot mitigation.',
      decisions: ['Cache static assets for a year (immutable hashes), and cache HTML with stale-while-revalidate.'],
    },
    {
      id: 'gateway',
      label: 'API gateway',
      kind: 'edge',
      tier: 1,
      tech: ['Go', 'Envoy', 'OIDC'],
      blurb: 'AuthN, rate limits, schema validation, trace stamping.',
      decisions: [
        'Rejects malformed requests at the edge, so services only see valid payloads.',
        'Token-bucket rate limits per tenant, backed by Redis.',
        'Starts the W3C trace that follows the request everywhere.',
      ],
    },
    {
      id: 'orders',
      label: 'Orders svc',
      kind: 'service',
      tier: 2,
      tech: ['Go', 'gRPC'],
      blurb: 'Owns the order aggregate; writes events via outbox.',
      decisions: [
        'Transactional outbox: the state change and the event commit atomically.',
        'Only 2 synchronous dependencies (down from 9) keep checkout resilient.',
      ],
    },
    {
      id: 'catalog',
      label: 'Catalog svc',
      kind: 'service',
      tier: 2,
      tech: ['Go', 'gRPC'],
      blurb: 'Read-heavy; CQRS projection into a search index.',
      decisions: ['Writes go to Postgres, reads to an OpenSearch projection kept fresh by events.'],
    },
    {
      id: 'billing',
      label: 'Billing svc',
      kind: 'service',
      tier: 2,
      tech: ['Rust'],
      blurb: 'Money math in integers, with exhaustive state machines.',
      decisions: ['Rust enums make illegal payment states unrepresentable.'],
    },
    {
      id: 'kafka',
      label: 'Kafka',
      kind: 'stream',
      tier: 3,
      tech: ['Kafka', 'Strimzi', 'Schema Registry'],
      blurb: 'Durable event log, per-tenant quotas, tiered storage.',
      decisions: [
        'Chosen over NATS JetStream for its ecosystem and tiered storage; ops cost is handled with Strimzi.',
        'Protobuf schemas with backwards-compatibility checks in CI.',
      ],
    },
    {
      id: 'workers',
      label: 'Stream workers',
      kind: 'stream',
      tier: 3,
      tech: ['Go', 'Flink'],
      blurb: 'Enrichment, fraud checks, projections.',
      decisions: ['Idempotent consumers record processed event IDs in the same transaction as their effects.'],
    },
    {
      id: 'postgres',
      label: 'PostgreSQL',
      kind: 'data',
      tier: 4,
      tech: ['Postgres 17', 'Patroni'],
      blurb: 'System of record, one schema per service.',
      decisions: ['No cross-service joins, ever. Shared data travels as events.'],
    },
    {
      id: 'lake',
      label: 'Lakehouse',
      kind: 'data',
      tier: 4,
      tech: ['Iceberg', 'DuckDB', 'dbt'],
      blurb: 'Every event lands here within 60s for analytics.',
      decisions: ['Iceberg tables allow time travel; dbt models are tested and documented.'],
    },
    {
      id: 'features',
      label: 'Feature store',
      kind: 'ml',
      tier: 5,
      tech: ['dbt', 'Redis'],
      blurb: 'Offline/online parity for model features.',
      decisions: ['The same dbt SQL materialises offline training sets and online features, so there is no skew.'],
    },
    {
      id: 'models',
      label: 'Forecast + risk models',
      kind: 'ml',
      tier: 5,
      tech: ['LightGBM', 'MLflow', 'BentoML'],
      blurb: 'Demand forecasts and fraud scoring.',
      decisions: [
        'Backtests gate promotion; a shadow deployment runs for one week before the model takes live traffic.',
        'Fraud scores come back in under 30 ms p99, served next to the stream workers.',
      ],
    },
    {
      id: 'otel',
      label: 'Observability',
      kind: 'obs',
      tier: 3,
      tech: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Pulse SLO'],
      blurb: 'Traces, metrics and logs, correlated by trace ID.',
      decisions: ['SLO-based, multi-window burn-rate alerting instead of threshold pages.'],
    },
  ],
  edges: [
    { from: 'web', to: 'cdn' },
    { from: 'mobile', to: 'gateway' },
    { from: 'partners', to: 'gateway' },
    { from: 'cdn', to: 'gateway' },
    { from: 'gateway', to: 'orders', label: 'gRPC' },
    { from: 'gateway', to: 'catalog', label: 'gRPC' },
    { from: 'orders', to: 'billing', label: 'gRPC' },
    { from: 'orders', to: 'postgres' },
    { from: 'catalog', to: 'postgres' },
    { from: 'orders', to: 'kafka', label: 'outbox', async: true },
    { from: 'billing', to: 'kafka', async: true },
    { from: 'kafka', to: 'workers', async: true },
    { from: 'workers', to: 'catalog', label: 'projection', async: true },
    { from: 'kafka', to: 'lake', label: 'sink', async: true },
    { from: 'lake', to: 'features' },
    { from: 'features', to: 'models' },
    { from: 'models', to: 'workers', label: 'fraud score' },
    { from: 'gateway', to: 'otel', async: true },
    { from: 'workers', to: 'otel', async: true },
  ],
};

export const skillGraph: ArchGraph = {
  id: 'skills',
  title: 'Skill topology',
  subtitle: 'How the pieces of my toolbox connect: every layer feeds the next.',
  tiers: ['interface', 'application', 'platform', 'data', 'insight'],
  nodes: [
    {
      id: 'ts',
      label: 'TypeScript',
      kind: 'client',
      tier: 0,
      tech: ['React', 'Preact', 'Astro', 'SvelteKit'],
      blurb: 'Typed UIs that stay fast.',
      decisions: ['Islands and server-first rendering by default.'],
    },
    {
      id: 'viz',
      label: 'Data viz',
      kind: 'client',
      tier: 0,
      tech: ['D3', 'Observable Plot', 'WebGL'],
      blurb: 'Charts that tell the truth.',
      decisions: ['Pick the chart form from the question, not the tool.'],
    },
    {
      id: 'go',
      label: 'Go',
      kind: 'service',
      tier: 1,
      tech: ['gRPC', 'chi', 'sqlc'],
      blurb: 'Services and CLIs.',
      decisions: ['Boring, explicit, fast to review.'],
    },
    {
      id: 'rust',
      label: 'Rust',
      kind: 'service',
      tier: 1,
      tech: ['tokio', 'axum', 'ratatui'],
      blurb: 'Hot paths and tooling.',
      decisions: ['Where correctness or latency really matter.'],
    },
    {
      id: 'py',
      label: 'Python',
      kind: 'service',
      tier: 1,
      tech: ['FastAPI', 'Polars'],
      blurb: 'Glue, APIs, and science.',
      decisions: ['Typed with mypy/pyright, packaged with uv.'],
    },
    {
      id: 'linux',
      label: 'Linux',
      kind: 'edge',
      tier: 2,
      tech: ['systemd', 'Fedora Atomic', 'eBPF'],
      blurb: 'Home turf.',
      decisions: ['Immutable hosts, containers for everything else.'],
    },
    {
      id: 'k8s',
      label: 'Kubernetes',
      kind: 'edge',
      tier: 2,
      tech: ['Helm', 'Argo CD', 'Strimzi'],
      blurb: 'GitOps everything.',
      decisions: ['Declarative, reviewed, reversible.'],
    },
    {
      id: 'iac',
      label: 'IaC',
      kind: 'edge',
      tier: 2,
      tech: ['Terraform', 'Nix', 'BlueBuild'],
      blurb: 'Infra as reviewed code.',
      decisions: ['If it is not in git, it does not exist.'],
    },
    {
      id: 'pg',
      label: 'PostgreSQL',
      kind: 'data',
      tier: 3,
      tech: ['Postgres', 'TimescaleDB'],
      blurb: 'The default database.',
      decisions: ['Start with Postgres and earn anything else.'],
    },
    {
      id: 'stream',
      label: 'Streaming',
      kind: 'stream',
      tier: 3,
      tech: ['Kafka', 'NATS', 'Flink'],
      blurb: 'Events as the integration layer.',
      decisions: ['Outbox, idempotency, traces.'],
    },
    {
      id: 'olap',
      label: 'Analytics eng',
      kind: 'data',
      tier: 3,
      tech: ['dbt', 'DuckDB', 'ClickHouse'],
      blurb: 'Tested, documented models.',
      decisions: ['Analytics code gets the same CI rigour as app code.'],
    },
    {
      id: 'ml',
      label: 'ML',
      kind: 'ml',
      tier: 4,
      tech: ['scikit-learn', 'LightGBM', 'PyTorch'],
      blurb: 'Models that ship.',
      decisions: ['Baseline first, honest backtests, monitored drift.'],
    },
    {
      id: 'stats',
      label: 'Statistics',
      kind: 'ml',
      tier: 4,
      tech: ['Bayesian', 'causal inference', 'A/B'],
      blurb: 'Knowing what the numbers mean.',
      decisions: ['Confidence intervals or it did not happen.'],
    },
    {
      id: 'obs',
      label: 'Observability',
      kind: 'obs',
      tier: 2,
      tech: ['OTel', 'Prometheus', 'Grafana'],
      blurb: 'Systems that explain themselves.',
      decisions: ['SLOs over dashboards-of-everything.'],
    },
  ],
  edges: [
    { from: 'ts', to: 'go' },
    { from: 'ts', to: 'py' },
    { from: 'viz', to: 'py' },
    { from: 'viz', to: 'olap', async: true },
    { from: 'go', to: 'k8s' },
    { from: 'rust', to: 'linux' },
    { from: 'go', to: 'linux' },
    { from: 'py', to: 'k8s' },
    { from: 'k8s', to: 'iac' },
    { from: 'linux', to: 'iac' },
    { from: 'k8s', to: 'pg' },
    { from: 'k8s', to: 'stream' },
    { from: 'obs', to: 'k8s', async: true },
    { from: 'stream', to: 'olap', async: true },
    { from: 'pg', to: 'olap', async: true },
    { from: 'olap', to: 'ml' },
    { from: 'olap', to: 'stats' },
    { from: 'ml', to: 'stats' },
    { from: 'rust', to: 'obs' },
  ],
};

export const graphs = [systemGraph, skillGraph];
