import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AutoSkeleton,
  AutoSkeletonProvider,
  type SkeletonLayout,
} from '@theengineeringmind/auto-skeleton/react';

const user = {
  name: 'Ada Lovelace',
  handle: '@ada',
  bio: "Mathematician and writer, chiefly known for her work on Charles Babbage's proposed mechanical general-purpose computer, the Analytical Engine.",
  tags: ['mathematics', 'poetry', 'engines', 'notes'],
};

function ProfileCard({ data }: { data: typeof user }) {
  return (
    <div style={{ font: '16px/1.5 system-ui, sans-serif' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="avatar" />
        <div>
          <div style={{ fontWeight: 600 }}>{data.name}</div>
          <div style={{ color: 'GrayText', fontSize: 14 }}>{data.handle}</div>
        </div>
        <span className="badge" style={{ marginLeft: 'auto' }}>
          Pro
        </span>
      </div>
      <p style={{ margin: '12px 0 0' }}>{data.bio}</p>
      <div className="cover" role="img" aria-label="cover" />
      <div style={{ marginTop: 12 }}>
        {data.tags.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="primary">Follow</button>
        <button className="secondary">Message</button>
      </div>
    </div>
  );
}

const rows = [
  ['INV-1042', 'Acme Corp', '$1,250.00', 'Paid'],
  ['INV-1043', 'Globex', '$980.50', 'Pending'],
  ['INV-1044', 'Initech', '$4,100.00', 'Overdue'],
  ['INV-1045', 'Umbrella', '$620.00', 'Paid'],
];

function InvoiceTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Invoice</th>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            {r.map((c, i) => (
              <td key={i}>{i === 3 ? <span className="badge">{c}</span> : c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Article() {
  return (
    <article style={{ font: '16px/1.6 Georgia, serif' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 22 }}>Why we stopped hand-writing skeletons</h3>
      <p style={{ margin: '0 0 12px', color: 'GrayText', fontSize: 13 }}>6 min read · Engineering</p>
      <p style={{ margin: 0 }}>
        Every loading state we shipped was a small lie: a stack of grey rectangles drawn from memory of what
        the component used to look like. Fonts changed, paddings changed, and the skeletons quietly drifted.
        Measuring the real component instead turned out to be both simpler and more honest.
      </p>
    </article>
  );
}

function Demo({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  const [layout, setLayout] = useState<SkeletonLayout | null>(null);
  return (
    <section className="demo">
      <h2>{title}</h2>
      <AutoSkeleton loading={loading} cacheKey={title} onLayout={setLayout}>
        {children}
      </AutoSkeleton>
      {layout && loading ? (
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 12 }}>
          {layout.blocks.length} blocks · {layout.width}×{layout.height}
        </p>
      ) : null}
    </section>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [width, setWidth] = useState(1100);
  const [color, setColor] = useState('#808080');
  const [highlight, setHighlight] = useState('#b0b0b0');
  const [duration, setDuration] = useState(1600);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setLoading((l) => !l), 2200);
    return () => clearInterval(id);
  }, [auto]);

  return (
    <main style={{ maxWidth: width, margin: '0 auto', transition: 'max-width 200ms' }}>
      <h1>auto-skeleton</h1>
      <p className="muted">
        Loading skeletons measured from the real components. Nothing below was drawn by hand.
      </p>
      <div className="controls">
        <button className="primary" onClick={() => setLoading((l) => !l)}>
          {loading ? 'Show content' : 'Show skeleton'}
        </button>
        <label>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto-toggle
        </label>
        <label>
          <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} /> shimmer
        </label>
        <label>
          width{' '}
          <input
            type="range"
            min={360}
            max={1400}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          color <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          highlight <input type="color" value={highlight} onChange={(e) => setHighlight(e.target.value)} />
        </label>
        <label>
          speed{' '}
          <input
            type="range"
            min={400}
            max={4000}
            step={100}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
      </div>
      <AutoSkeletonProvider
        color={`${color}40`}
        highlight={`${highlight}80`}
        duration={duration}
        animate={animate}
      >
        <div className="grid">
          <Demo title="Profile card" loading={loading}>
            <ProfileCard data={user} />
          </Demo>
          <Demo title="Invoice table" loading={loading}>
            <InvoiceTable />
          </Demo>
          <Demo title="Article" loading={loading}>
            <Article />
          </Demo>
          <Demo title="Code" loading={loading}>
            <pre>{`import { AutoSkeleton } from '@theengineeringmind/auto-skeleton/react';

<AutoSkeletonProvider color="#8884" highlight="#8888">
  <AutoSkeleton loading={isLoading} cacheKey="profile">
    <ProfileCard data={user} />
  </AutoSkeleton>
</AutoSkeletonProvider>`}</pre>
          </Demo>
        </div>
      </AutoSkeletonProvider>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
