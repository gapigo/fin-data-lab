import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface FundGraphProps {
  cnpj: string;
}

const getClasseColor = (classe: string, isRoot: boolean) => {
  if (isRoot) return 'var(--accent-primary)';
  if (classe?.toLowerCase().includes('ação') || classe?.toLowerCase().includes('acoes')) return 'var(--acoes-color)';
  if (classe?.toLowerCase().includes('cripto') || classe?.toLowerCase().includes('crypto')) return 'var(--crypto-color)';
  return 'var(--cvm-color)';
};

export const FundGraph = ({ cnpj }: FundGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !cnpj) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = 500;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    fetch(`/api/funds/${cnpj}/graph`)
      .then(r => r.json())
      .then(data => {
        const nodes = data.nodes || [];
        const links = data.links || [];
        if (nodes.length === 0) {
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-muted)')
            .text('Nenhum dado de estrutura disponível');
          return;
        }

        const radiusScale = d3.scaleSqrt()
          .domain([0, d3.max(nodes, (d: any) => d.pl) || 1])
          .range([6, 30]);

        const simulation = d3.forceSimulation(nodes as any)
          .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-300))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collide', d3.forceCollide((d: any) => radiusScale(d.pl || 0) + 5));

        const link = g.append('g')
          .selectAll('line')
          .data(links)
          .join('line')
          .attr('stroke', 'var(--border-default)')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', (d: any) => Math.max(0.5, Math.min(4, (d.weight || 0) * 4)));

        const node = g.append('g')
          .selectAll('g')
          .data(nodes)
          .join('g')
          .style('cursor', 'pointer');

        node.append('circle')
          .attr('r', (d: any) => d.isRoot ? 12 : radiusScale(d.pl || 0))
          .attr('fill', (d: any) => getClasseColor(d.classe, d.isRoot))
          .attr('stroke', 'var(--bg-elevated)')
          .attr('stroke-width', 2);

        node.append('text')
          .text((d: any) => d.name || '')
          .attr('x', (d: any) => (d.isRoot ? 12 : radiusScale(d.pl || 0)) + 4)
          .attr('y', 4)
          .attr('font-size', '11px')
          .attr('fill', 'var(--text-primary)')
          .attr('pointer-events', 'none');

        const tooltip = d3.select(container)
          .append('div')
          .style('position', 'absolute')
          .style('padding', '8px 12px')
          .style('background', 'var(--bg-elevated)')
          .style('border', '1px solid var(--border-default)')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('transition', 'opacity 0.15s')
          .style('color', 'var(--text-primary)')
          .style('z-index', '10');

        node
          .on('mouseover', (event: any, d: any) => {
            tooltip.style('opacity', 1)
              .html(`<strong>${d.name}</strong><br/>PL: R$ ${(d.pl || 0).toLocaleString('pt-BR')}<br/>Classe: ${d.classe || '-'}`);
          })
          .on('mousemove', (event: any) => {
            tooltip
              .style('left', (event.layerX + 12) + 'px')
              .style('top', (event.layerY + 12) + 'px');
          })
          .on('mouseout', () => tooltip.style('opacity', 0))
          .on('click', (_event: any, d: any) => {
            if (!d.isRoot && d.id) {
              window.location.href = `/cvm/lab/${d.id}`;
            }
          });

        const drag = d3.drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          });

        node.call(drag as any);

        simulation.on('tick', () => {
          link
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

          node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        // Fix root node in center
        const rootNode = nodes.find((n: any) => n.isRoot);
        if (rootNode) {
          (rootNode as any).fx = width / 2;
          (rootNode as any).fy = height / 2;
        }
      })
      .catch(() => {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', height / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--text-muted)')
          .text('Erro ao carregar grafo');
      });

    return () => {
      container.innerHTML = '';
    };
  }, [cnpj]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '500px', position: 'relative' }}
      className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)]"
    />
  );
};
