'use client';
import { useState } from 'react';
import { useOrgChart, useChangeParent, useUpdateAdminUser, useAdminUsers } from '@/hooks/useAdmin';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import type { OrgNode } from '@/types/api';

function OrgNodeItem({
  node, depth, onSelect,
}: {
  node: OrgNode; depth: number; onSelect: (n: OrgNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 rounded-md hover:bg-surface2 cursor-pointer transition-colors group"
        style={{ paddingLeft: depth * 20 + 8 }}
        onClick={() => onSelect(node)}
      >
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-text2"
        >
          {hasChildren
            ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
            : <span className="h-3.5 w-3.5 inline-block border-l border-b border-c-border rounded-bl-sm ml-2" />}
        </button>
        <UserAvatar name={node.name} avatarUrl={null} className="h-6 w-6 text-[10px] shrink-0" />
        <span className="text-sm text-text flex-1">{node.name}</span>
        <Badge variant={node.role === 'super_admin' ? 'warning' : 'muted'} className="text-[10px] opacity-0 group-hover:opacity-100 mr-2">
          {node.role === 'super_admin' ? 'Admin' : 'User'}
        </Badge>
        {hasChildren && (
          <span className="text-[10px] text-text2 mr-2">{node.children.length} reports</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <OrgNodeItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function flattenNodes(nodes: OrgNode[]): OrgNode[] {
  return nodes.flatMap(n => [n, ...flattenNodes(n.children)]);
}

function EditPanel({
  node, allNodes, onClose,
}: {
  node: OrgNode; allNodes: OrgNode[]; onClose: () => void;
}) {
  const changeParent = useChangeParent(node.id);
  const [newParentId, setNewParentId] = useState(node.reportsTo ?? 'none');

  const eligible = allNodes.filter(n => n.id !== node.id);

  const handleSave = async () => {
    await changeParent.mutateAsync(newParentId === 'none' ? null : newParentId);
    onClose();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <UserAvatar name={node.name} avatarUrl={null} className="h-10 w-10 text-sm" />
        <div>
          <p className="text-sm font-semibold text-text">{node.name}</p>
          <p className="text-xs text-text2">Depth {node.depth}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Reports To</Label>
          <Select value={newParentId} onValueChange={setNewParentId}>
            <SelectTrigger>
              <SelectValue placeholder="No manager (root)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No manager (root)</SelectItem>
              {eligible.map(n => (
                <SelectItem key={n.id} value={n.id} className="text-xs">{n.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={changeParent.isPending}>
            {changeParent.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}

export default function OrgChartPage() {
  const { data: roots = [], isLoading } = useOrgChart();
  const [selected, setSelected] = useState<OrgNode | null>(null);

  const allNodes = flattenNodes(roots);
  const totalCount = allNodes.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Org Chart" />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-text2" />
                <span className="text-xs text-text2">{totalCount} members</span>
              </div>
              <Card className="p-3">
                {roots.length === 0 ? (
                  <p className="text-sm text-text2 py-4 text-center">No users found.</p>
                ) : roots.map(node => (
                  <OrgNodeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    onSelect={n => setSelected(s => s?.id === n.id ? null : n)}
                  />
                ))}
              </Card>
            </div>

            <div>
              {selected ? (
                <EditPanel node={selected} allNodes={allNodes} onClose={() => setSelected(null)} />
              ) : (
                <Card className="p-4 text-center">
                  <Users className="h-8 w-8 text-text2 mx-auto mb-2" />
                  <p className="text-sm text-text2">Click a member to edit their hierarchy position.</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
