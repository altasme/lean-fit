import { useState } from 'react';
import type { TerritoryNode } from '../../lib/adminTerritoryMap';
import { countPartnerTypesInRegion } from '../../lib/adminTerritoryMap';

function CountPill({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <span className="tabular inline-flex items-center gap-1 rounded-full border border-white/10 bg-lf-black px-2.5 py-1 text-xs text-lf-cream/70">
      <span className="font-semibold text-lf-gold">{value}</span> {label}
    </span>
  );
}

function Row({
  name,
  depth,
  expanded,
  hasChildren,
  onToggle,
  pills,
}: {
  name: string;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  pills: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={hasChildren ? onToggle : undefined}
      disabled={!hasChildren}
      className={`flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/5 py-3 text-left transition-colors ${
        hasChildren ? 'hover:bg-white/[0.03]' : 'cursor-default'
      }`}
      style={{ paddingLeft: `${12 + depth * 24}px`, paddingRight: 12 }}
    >
      <span className={`w-4 shrink-0 text-xs text-lf-cream/40 ${hasChildren ? '' : 'invisible'}`}>
        {expanded ? '▾' : '▸'}
      </span>
      <span className="min-w-[160px] flex-1 text-sm text-lf-white">{name}</span>
      <span className="flex flex-wrap items-center gap-1.5">{pills}</span>
    </button>
  );
}

/**
 * Read-only coverage report - Region -> City -> Barangay, nothing
 * auto-expanded (client explicitly wants click-to-open only, no default-
 * expanded first level). Each row shows Franchise/Distributor/Reseller
 * counts for that node and everything beneath it; capacity/CRUD lives on
 * the Territories page, not here - this is purely "how many partners are
 * where."
 */
export function TerritoryTreeNode({ node, depth = 0 }: { node: TerritoryNode; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  if (node.level === 'region') {
    const counts = countPartnerTypesInRegion(node);
    return (
      <div>
        <Row
          name={node.name}
          depth={depth}
          expanded={expanded}
          hasChildren={hasChildren}
          onToggle={() => setExpanded((e) => !e)}
          pills={
            <>
              <CountPill label="Franchise" value={counts.franchise} />
              <CountPill label="Distributor" value={counts.distributor} />
              <CountPill label="Reseller" value={counts.reseller} />
              {counts.franchise + counts.distributor + counts.reseller === 0 && (
                <span className="text-xs text-lf-cream/40">No coverage yet</span>
              )}
            </>
          }
        />
        {expanded && hasChildren && (
          <div className="max-h-[420px] overflow-y-auto">
            {node.children.map((city) => (
              <TerritoryTreeNode key={city.id} node={city} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (node.level === 'city') {
    const resellerCount = node.children.reduce((sum, b) => sum + b.occupiedCount, 0);
    return (
      <div>
        <Row
          name={node.name}
          depth={depth}
          expanded={expanded}
          hasChildren={hasChildren}
          onToggle={() => setExpanded((e) => !e)}
          pills={
            <>
              <CountPill label="Distributor" value={node.occupiedCount} />
              <CountPill label="Reseller" value={resellerCount} />
              {node.occupiedCount + resellerCount === 0 && (
                <span className="text-xs text-lf-cream/40">No coverage yet</span>
              )}
            </>
          }
        />
        {expanded && hasChildren && (
          <div className="max-h-[320px] overflow-y-auto">
            {node.children.map((barangay) => (
              <TerritoryTreeNode key={barangay.id} node={barangay} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Barangay - leaf node, Reseller count only.
  return (
    <Row
      name={node.name}
      depth={depth}
      expanded={false}
      hasChildren={false}
      onToggle={() => {}}
      pills={
        node.occupiedCount > 0 ? (
          <CountPill label="Reseller" value={node.occupiedCount} />
        ) : (
          <span className="text-xs text-lf-cream/40">Vacant</span>
        )
      }
    />
  );
}
