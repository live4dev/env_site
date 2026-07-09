"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const CytoscapeComponent = dynamic(() => import("react-cytoscapejs"), { ssr: false });

export function GraphClient({ nodes, edges }: { nodes: { id: string; label: string; slug: string }[]; edges: { source: string; target: string }[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const visible = new Set(nodes.filter((node) => node.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((node) => node.id));
    const graphNodes = query ? nodes.filter((node) => visible.has(node.id)) : nodes;
    const graphEdges = query ? edges.filter((edge) => visible.has(edge.source) || visible.has(edge.target)) : edges;
    return [
      ...graphNodes.map((node) => ({ data: { id: node.id, label: node.label, slug: node.slug } })),
      ...graphEdges.map((edge, index) => ({ data: { id: `e${index}`, source: edge.source, target: edge.target } })),
    ];
  }, [nodes, edges, query]);

  return (
    <div className="grid gap-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2" placeholder="Найти узел..." />
      <div className="h-[70vh] rounded-lg border border-[var(--line)] bg-[var(--panel)]">
        <CytoscapeComponent
          elements={filtered}
          style={{ width: "100%", height: "100%" }}
          layout={{ name: "cose", animate: false }}
          stylesheet={[
            { selector: "node", style: { label: "data(label)", "font-size": 9, "background-color": "#216869", color: "var(--foreground)" } },
            { selector: "edge", style: { width: 1, "line-color": "#8b9992", "target-arrow-color": "#8b9992", "target-arrow-shape": "triangle", "curve-style": "bezier" } },
          ]}
          cy={(cy) => {
            cy.on("tap", "node", (event) => {
              const slug = event.target.data("slug");
              if (slug) window.location.href = `/notes/${slug}`;
            });
          }}
        />
      </div>
    </div>
  );
}
