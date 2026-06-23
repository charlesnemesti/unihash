import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'signal-001', label: 'ARTIFACTS' },
  { id: 'signal-002', label: 'LIFECYCLE' },
  { id: 'signal-003', label: 'ONCHAIN ART' },
  { id: 'signal-004', label: 'CONTRACTS' },
  { id: 'signal-005', label: 'METADATA' },
  { id: 'signal-006', label: 'WHOLE-TOKEN MINT' },
  { id: 'signal-007', label: 'TOKENOMICS' },
  { id: 'signal-008', label: 'SECURITY' },
  { id: 'signal-009', label: 'VERIFICATION' },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

function SignalBadge({ children }) {
  return (
    <span className="mb-4 inline-block border border-fluor px-2 py-1 text-xs text-fluor">
      {children}
    </span>
  );
}

function CardTitle({ children }) {
  return (
    <h2
      className="mb-4 text-3xl uppercase text-fluor"
      style={{ fontFamily: "'VT323', monospace" }}
    >
      {children}
    </h2>
  );
}

function DocCard({ id, badge, title, children }) {
  return (
    <div
      id={id}
      className="mb-8 border border-zinc-800 bg-zinc-900/40 p-8"
      style={{ scrollMarginTop: '6rem' }}
    >
      {badge ? <SignalBadge>{badge}</SignalBadge> : null}
      {title ? <CardTitle>{title}</CardTitle> : null}
      {children}
    </div>
  );
}

function GridItem({ children }) {
  return (
    <div className="flex items-center gap-3 border border-zinc-800 bg-zinc-950 p-4 text-sm">
      <div className="h-2 w-2 shrink-0 bg-fluor" aria-hidden="true" />
      <span className="uppercase tracking-wide text-zinc-200">{children}</span>
    </div>
  );
}

function ItemGrid({ items }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <GridItem key={item}>{item}</GridItem>
      ))}
    </div>
  );
}

function SpecGrid({ specs }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {specs.map(({ label, value }) => (
        <div
          key={label}
          className="border border-zinc-800 bg-zinc-950 p-4"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
          <p className="mt-2 text-sm uppercase tracking-wide text-fluor">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="mt-6 overflow-x-auto border border-zinc-800 bg-black p-4 text-xs leading-relaxed text-fluor">
      {children}
    </pre>
  );
}

function Accent({ children }) {
  return <span className="text-fluor">{children}</span>;
}

function SidebarLink({ id, label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`w-full py-2 text-left text-xs uppercase tracking-[0.18em] transition-colors hover:text-fluor ${
        isActive ? 'text-fluor' : 'text-zinc-500'
      }`}
    >
      {isActive ? '> ' : ''}
      {label}
    </button>
  );
}

export default function Whitepaper() {
  const [activeId, setActiveId] = useState('overview');

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleNav = (id) => {
    setActiveId(id);
    scrollToSection(id);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <a
            href="/"
            className="shrink-0 text-2xl uppercase tracking-[0.12em] text-fluor md:text-3xl"
            style={{ fontFamily: "'VT323', monospace" }}
          >
            UniHash $HASH
          </a>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href="/#wallet"
              className="hidden border border-fluor bg-fluor px-4 py-2 text-xs uppercase tracking-widest text-black sm:inline-flex"
            >
              Buy $HASH ↗
            </a>
            <a
              href="/"
              className="border border-zinc-700 px-4 py-2 text-xs uppercase tracking-widest text-zinc-300 transition-colors hover:border-fluor hover:text-fluor"
            >
              ← Home
            </a>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen bg-zinc-950 font-mono text-zinc-300">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-zinc-800 p-6 lg:block">
        <p className="mb-6 text-xs uppercase tracking-[0.28em] text-fluor">Docs</p>
        <nav className="flex flex-col gap-1" aria-label="Section navigation">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.id}
              id={item.id}
              label={item.label}
              isActive={activeId === item.id}
              onClick={handleNav}
            />
          ))}
        </nav>
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <a
            href="/"
            className="text-xs uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-fluor"
          >
            ← Back to landing
          </a>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <nav
          className="mb-6 flex gap-2 overflow-x-auto border border-zinc-800 bg-zinc-900/40 p-3 lg:hidden"
          aria-label="Mobile section navigation"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`shrink-0 px-3 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors hover:text-fluor ${
                activeId === item.id ? 'text-fluor' : 'text-zinc-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mx-auto max-w-4xl">
          <DocCard
            id="overview"
            badge="// unihash.protocol"
            title="UniHash Docs"
          >
            <p className="text-sm leading-relaxed text-zinc-400">
              <Accent>EVM-native SVG renderer</Accent> and Base64 core. Hold{' '}
              <Accent>$HASH</Accent>, spawn living <Accent>24×24</Accent> artifacts, seal them
              on-chain — no IPFS, no servers, no admin mint key.
            </p>
            <SpecGrid
              specs={[
                { label: 'Network', value: 'Ethereum L1' },
                { label: 'Supply', value: '5,000 $HASH' },
                { label: 'Token', value: 'ERC-20 + ERC-721' },
              ]}
            />
          </DocCard>

          <DocCard id="signal-001" badge="// signal 001" title="Artifact model">
            <p className="text-sm leading-relaxed text-zinc-400">
              A <Accent>Hash</Accent> is the native on-chain object paired with{' '}
              <Accent>$HASH</Accent> holdings. The ERC-20 remains transferable even when an
              external venue cannot render the SVG directly.
            </p>
            <ItemGrid
              items={[
                'one living Hash per 1 whole $HASH held',
                'generic ERC-20 transfers stay portable',
                'fractional balances below 1 do not mint',
                'drop below 1 whole token and the NFT burns',
              ]}
            />
          </DocCard>

          <DocCard id="signal-002" badge="// signal 002" title="Lifecycle">
            <p className="text-sm leading-relaxed text-zinc-400">
              The system separates portable balances, live art, frozen claims, whole-token spawns,
              and irreversible seals.
            </p>
            <ItemGrid
              items={[
                'ERC-20 balance · portable $HASH through Uniswap and standard wallets',
                'live Hash · objectURI recomputed on each tokenURI() call',
                'sealed Hash · frozen tokenURI snapshot written at seal time',
                'whole-token spawn · 1 $HASH held authorizes 1 living Hash NFT',
                'burn on sell-down · balance below 1 whole token burns the NFT',
                'seal · one-way transition from live objectURI to frozen tokenURI',
              ]}
            />
          </DocCard>

          <DocCard id="signal-003" badge="// signal 003" title="Onchain art">
            <p className="text-sm leading-relaxed text-zinc-400">
              Base renders are compact <Accent>24×24 SVGs</Accent> generated from packed genome
              data. Stable traits stay fixed per artifact, while live Hashes read current balance
              state at render time. Sealed Hashes hold a frozen mutation snapshot.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              No canonical offchain media dependency. GIF and MP4 exports are optional off-chain
              tooling for social avatars — not the source of truth.
            </p>
            <ItemGrid
              items={[
                '24×24 pixel grid mapped to SVG <rect> elements',
                'palette: void black, fluor yellow, white',
                'genome seed from owner address + spawn block + tokenId',
                'sealed snapshot freezes render in contract storage',
              ]}
            />
          </DocCard>

          <DocCard id="signal-004" badge="// signal 004" title="Contract surfaces">
            <p className="text-sm leading-relaxed text-zinc-400">
              UniHash is four primary public surfaces with linked renderer libraries behind them.
              Contracts are designed to be wired once, then locked by renouncing token ownership.
            </p>
            <ItemGrid
              items={[
                'HashToken · ERC-20 coordination token, fixed supply, Uniswap v4 pool entry',
                'HashRegistry · ERC-721 ledger, whole-token mint, seal/freeze logic',
                'SvgRenderer · on-chain 24×24 SVG generator, pure function library',
                'MetadataAssembler · Base64 JSON wrapper returning data:application/json',
              ]}
            />
          </DocCard>

          <DocCard id="signal-005" badge="// signal 005" title="Metadata">
            <p className="text-sm leading-relaxed text-zinc-400">
              UniHash metadata is onchain. Live Hashes mutate with holder state; sealed claims are
              frozen except through the one-way seal operation.
            </p>
            <ItemGrid
              items={[
                'live Hashes render through objectURI',
                'sealed Hashes render through frozen tokenURI',
                'spawn block is retained in metadata',
                'SVG is canonical in the image field',
                'no canonical offchain media dependency',
              ]}
            />
            <CodeBlock>{`{
  "name": "Hash #0042",
  "description": "UniHash · 100% on-chain · spawn block 19842103",
  "image": "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjQgMjQnP..."
}`}</CodeBlock>
          </DocCard>

          <DocCard id="signal-006" badge="// signal 006" title="Whole-token mint">
            <p className="text-sm leading-relaxed text-zinc-400">
              There is no public mint page. The registry watches $HASH balances on every transfer
              and spawns or burns Hashes automatically — 1 whole token in, 1 NFT out; below 1, the NFT burns.
            </p>
            <ItemGrid
              items={[
                '1 Hash per 1 whole $HASH — floor division, fractions do not mint',
                'transfer-hook accounting spawns without a user transaction',
                'balance below 1 whole token triggers an automatic NFT burn',
              ]}
            />
            <CodeBlock>{`struct SpawnRecord {
  uint64  spawnBlock;
  uint64  spawnTimestamp;
  address spawner;
  uint256 hashBalance;
}`}</CodeBlock>
          </DocCard>

          <DocCard id="signal-007" badge="// signal 007" title="$HASH tokenomics">
            <p className="text-sm leading-relaxed text-zinc-400">
              Fair launch. Fixed supply. The entire allocation pairs against{' '}
              <Accent>1 ETH</Accent> at genesis — no team tokens, no vesting, no admin mint key.
            </p>
            <CodeBlock>{`total supply:  5,000 $HASH
decimals:      18
max buy / tx:  5 (0.1% of supply)
max wallet:    100 (2% of supply)
swap fee:      4% → protocol treasury
NFT transfer:  0% at protocol level
mint rule:     1 whole $HASH = 1 NFT · <1 burns`}</CodeBlock>
            <ItemGrid
              items={[
                'native ETH / $HASH pool on Uniswap v4',
                'exact-input buys only at launch',
                'no team allocation or vesting contracts',
                'no admin mint key after ownership renounce',
              ]}
            />
          </DocCard>

          <DocCard id="signal-008" badge="// signal 008" title="Security model">
            <p className="text-sm leading-relaxed text-zinc-400">
              Users trust Ethereum consensus and deployed bytecode — not a team server. Admin keys,
              if any exist at launch, are limited to pausing and carry a documented sunset timeline.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              $HASH is portable as an ERC-20. Generic transfers update NFT entitlement on every balance
              change — hold 1 whole token to keep your Hash; drop below 1 and it burns.
            </p>
            <ItemGrid
              items={[
                'gas bounding via hard 24×24 render cap',
                'whole-token snapshots prevent gaming at mint boundaries',
                'marketplace caching — seal to freeze for indexers',
                'ownership renounce before public trading',
              ]}
            />
          </DocCard>

          <DocCard id="signal-009" badge="// signal 009" title="Source verification">
            <p className="text-sm leading-relaxed text-zinc-400">
              Published addresses should be verified against the release commit and contract size
              checks before integration. Anyone can audit a Hash without trusting this website.
            </p>
            <ItemGrid
              items={[
                '$HASH (ERC-20) · 0x0000…0000 · pending deploy',
                'HashRegistry · 0x0000…0000 · pending deploy',
                'SvgRenderer · 0x0000…0000 · pending deploy',
                'Uniswap v4 Pool · 0x0000…0000 · pending deploy',
              ]}
            />
            <CodeBlock>{`read tokenURI(tokenId) on HashRegistry
decode Base64 JSON → render inline SVG
cross-check spawnRecord(tokenId) vs block history

α  testnet + whitepaper     Q2 2026
β  mainnet fair launch      Q3 2026
γ  marketplace integration  Q3 2026
δ  seal ceremony + gallery  Q4 2026`}</CodeBlock>
            <p className="mt-6 border-t border-zinc-800 pt-6 text-xs leading-relaxed text-zinc-500">
              Docs are updated from the exact source tree being reviewed. This document is a
              technical specification draft — not financial or legal advice.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href="/"
                className="border border-zinc-700 px-5 py-3 text-xs uppercase tracking-widest text-zinc-300 transition-colors hover:border-fluor hover:text-fluor"
              >
                ← Back to landing
              </a>
              <a
                href="/#wallet"
                className="border border-fluor bg-fluor px-5 py-3 text-xs uppercase tracking-widest text-black transition-opacity hover:opacity-90"
              >
                Connect wallet ↗
              </a>
            </div>
          </DocCard>
        </div>

        <footer className="mx-auto mt-4 max-w-4xl border-t border-zinc-800 py-8 text-center text-[10px] uppercase tracking-[0.3em] text-fluor">
          © 2026 UniHash · on-chain &amp; verifiable · $HASH
        </footer>
      </main>
      </div>
    </>
  );
}
