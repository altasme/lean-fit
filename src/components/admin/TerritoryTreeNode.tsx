import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TerritoryNode } from '../../lib/adminTerritoryMap';
import { TERRITORY_LEVEL_PARTNER_TYPE } from '../../types/territory';
import { PARTNER_STATUS_LABELS } from '../../types/partner';

function statusBadge(node: TerritoryNode) {
  if (node.capacity != null && node.occupiedCount >= node.capacity) {
    return <span className="text-lf-error">Full</span>;
  }
  if (node.occupiedCount > 0) {
    return <span className="text-lf-gold">Active Coverage</span>;
  }
  return <span className="text-lf-success">Available</span>;
}

export function TerritoryTreeNode({ node, depth = 0 }: { node: TerritoryNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const expectedType = TERRITORY_LEVEL_PARTNER_TYPE[node.level];

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-white/5 py-2.5"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setExpanded((e) => !e)}
          className={`w-4 shrink-0 text-left text-xs text-lf-cream/50 ${hasChildren ? 'hover:text-lf-gold' : 'invisible'}`}
        >
          {expanded ? '▾' : '▸'}
        </button>

        <span className="min-w-[160px] text-sm text-lf-white">{node.name}</span>

        <span className="min-w-[90px] text-xs uppercase tracking-wide2 text-lf-cream/40">
          {expectedType}
        </span>

        <span className="tabular text-xs text-lf-cream/60">
          {node.occupiedCount}
          {node.capacity != null ? `/${node.capacity}` : ' (unlimited)'}
        </span>

        <span className="text-xs">{statusBadge(node)}</span>

        <span className="flex-1 text-xs text-lf-cream/70">
          {node.occupants.length === 0 ? (
            <span className="text-lf-cream/40">No partner assigned</span>
          ) : (
            node.occupants.map((o, i) => (
              <span key={o.id}>
                {i > 0 && ', '}
                <Link to={`/admin/partners/${o.id}`} className="text-lf-gold hover:underline">
                  {o.full_name}
                </Link>
                {o.status !== 'active' && (
                  <span className="text-lf-cream/40"> ({PARTNER_STATUS_LABELS[o.status]})</span>
                )}
              </span>
            ))
          )}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TerritoryTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
