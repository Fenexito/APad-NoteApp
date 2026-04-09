// src/shortkeys/ShortkeyFlowEditor.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
// --- Auto-ajuste de altura para textareas ---
function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  ConnectionMode,
} from "reactflow";
import { BezierEdge } from "reactflow";
import { ReactFlowProvider, useReactFlow } from "reactflow";
import "reactflow/dist/style.css";

/** ================== Utils ================== **/
function sanitizeId(v) {
  return (v || "")
    .replace(/@/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^_+/, ""); // ⚠️ ya NO quitamos "_" al final
}
// Inserta "_" en la posición del caret al presionar Space
function insertUnderscoreAtCaret(e, current, setValueCb) {
  const el = e.currentTarget;
  if (!el) return;
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? start;
  const next = (current || "").slice(0, start) + "_" + (current || "").slice(end);
  setValueCb(next);
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(start + 1, start + 1);
    } catch {}
  });
}
function ensureTemplateStep(steps) {
  const hasTpl = (steps || []).some((s) => s.type === "template");
  return hasTpl ? steps : [...(steps || []), { id: "result", type: "template", template: "" }];
}
function idxOfTemplate(steps) {
  return (steps || []).findIndex((s) => s.type === "template");
}

/** Deriva nodos y edges a partir de steps */
function stepsToFlow(steps) {
  const nodes = [];
  const edges = [];

  const layoutX = 160;
  const layoutY = 140;

  (steps || []).forEach((s, i) => {
    if (s.type === "select") {
      nodes.push({
        id: s.id,
        type: "selectNode",
        position: s.pos || { x: 100 + (i % 3) * layoutX, y: 160 + Math.floor(i / 3) * layoutY },
        data: {
          id: s.id,
          prompt: s.prompt || "",
          options: s.options || [],
        },
        selectable: true,
        draggable: true,
      });

      (s.options || []).forEach((opt, oi) => {
        if (!opt?.nextStep) return;
        edges.push({
          id: `${s.id}__${oi}__${opt.nextStep}`,
          source: s.id,
          sourceHandle: `opt-${oi}`,
          target: opt.nextStep,
          type: "bezier",
          animated: false,
        });
      });
    } else if (s.type === "template") {
      nodes.push({
        id: "result",
        type: "resultNode",
        position: s.pos || { x: 540, y: 200 },
        data: {
          snippet: (s.template || "").slice(0, 80),
        },
        selectable: true,
        draggable: true,
      });
    }
  });

  return { nodes, edges };
}

/** ================== Nodos custom ================== **/
function SelectNode({ data, selected }) {
  const options = data.options || [];
  return (
    <div
      className={`rounded-xl border bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 shadow-md px-3 py-2 min-w-[320px] max-w-[380px] ${
        selected ? "ring-2 ring-blue-400/70" : "ring-1 ring-blue-100/70 dark:ring-slate-700/70"
      }`}
    >
      {/* Handle target (más grande) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          top: 16,
          width: 16,
          height: 16,
          borderRadius: 9999,
          background: "#0ea5e9",         // sky-500
          border: "2px solid #ffffff",
          boxShadow: "0 0 0 2px rgba(14,165,233,0.35)",
        }}
      />

      {/* Encabezado */}
      <div className="border-b border-blue-100/70 dark:border-slate-700 pb-2 mb-2">
        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Variable</div>
        <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100">@{data.id}</div>
        <div className="text-[12px] text-slate-600 dark:text-slate-300 truncate">
          {data.prompt || "Pregunta…"}
        </div>
      </div>

      {/* Opciones visibles: solo título + handle por opción (más grande) */}
      <div className="space-y-2">
        {options.length === 0 && (
          <div className="text-[12px] text-slate-500">Sin opciones…</div>
        )}
        {options.map((opt, i) => (
          <div
            key={i}
            className="relative rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 px-2 py-2 pr-6"
          >
            <div className="flex items-center gap-2 text-[12px]">
              <span className="inline-flex items-center rounded-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1.5 py-[1px] font-semibold">
                {i + 1}
              </span>
              <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                {opt.label || <i className="text-slate-400">Label</i>}
              </span>
            </div>

            {/* Handle source de la opción */}
            <Handle
              type="source"
              position={Position.Right}
              id={`opt-${i}`}
              style={{
                right: -10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                borderRadius: 9999,
                background: "#2563eb",      // blue-600
                border: "2px solid #ffffff",
                boxShadow: "0 0 0 2px rgba(37,99,235,0.35)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultNode({ data, selected }) {
  return (
    <div
      className={`rounded-xl border bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 shadow-md px-3 py-2 min-w-[320px] max-w-[420px] ${
        selected ? "ring-2 ring-blue-400/70" : "ring-1 ring-blue-100/70 dark:ring-slate-700/70"
      }`}
    >
      {/* Handle target (más grande) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          top: 16,
          width: 16,
          height: 16,
          borderRadius: 9999,
          background: "#10b981",         // emerald-500
          border: "2px solid #ffffff",
          boxShadow: "0 0 0 2px rgba(16,185,129,0.35)",
        }}
      />
      <div className="border-b border-blue-100/70 dark:border-slate-700 pb-2 mb-2">
        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Plantilla final</div>
      </div>
      <div className="text-[12px] text-slate-800 dark:text-slate-100 whitespace-pre-wrap max-h-[160px] overflow-auto">
        {data.snippet ? <span className="block">{data.snippet}…</span> : <i className="text-slate-400">Sin contenido…</i>}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        id: <b>result</b>
      </div>
    </div>
  );
}

const nodeTypes = { selectNode: SelectNode, resultNode: ResultNode };

/** ================== Editor Flow ================== **/
export default function ShortkeyFlowEditor({ value, onChange }) {
  // value: { key, tags, steps: [...] }
  const [steps, setSteps] = useState(() => ensureTemplateStep(value?.steps || []));
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Estados controlados para nodos/edges (drag fluido)
  const initialFlow = useMemo(() => stepsToFlow(steps), []); // baseline
  const [nodes, setNodes] = useState(initialFlow.nodes);
  const [edges, setEdges] = useState(initialFlow.edges);

  useEffect(() => {
    setSteps(ensureTemplateStep(value?.steps || []));
  }, [value]);

  // Rehacer edges al cambiar steps (manteniendo posiciones)
  useEffect(() => {
    const { nodes: freshNodes, edges: freshEdges } = stepsToFlow(steps);
    const posMap = Object.fromEntries((nodes || []).map((n) => [n.id, n.position]));
    const merged = freshNodes.map((n) => ({
      ...n,
      position: posMap[n.id] ?? n.position,
    }));
    setNodes(merged);
    setEdges(freshEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const stepIds = useMemo(
    () => steps.filter((s) => s.type === "select").map((s) => s.id),
    [steps]
  );
  const tplIndex = useMemo(() => idxOfTemplate(steps), [steps]);

  // Comunicar cambios arriba
  const commit = useCallback(
    (nextSteps) => {
      setSteps(nextSteps);
      onChange?.({ ...(value || {}), steps: nextSteps });
    },
    [onChange, value]
  );

  // Añadir variable
  const addVariable = () => {
    const id = `var_${Math.random().toString(36).slice(2, 6)}`;
    const pos = {
      x: 100 + (stepIds.length % 3) * 160,
      y: 160 + Math.floor(stepIds.length / 3) * 140,
    };
    const next = [
      ...steps.filter((s) => s.type === "select"),
      {
        id,
        type: "select",
        prompt: "Pregunta…",
        options: [{ label: "Opción 1", value: "Opción 1", nextStep: "result" }],
        pos,
      },
      steps[tplIndex],
    ];
    commit(next);
    setSelectedNodeId(id);
  };

  // Eliminar nodo (solo select)
  const deleteNode = (nodeId) => {
    if (nodeId === "result") return;
    const next = steps
      .filter((s) => s.id !== nodeId)
      .map((s) => {
        if (s.type !== "select") return s;
        const opts = (s.options || []).map((o) =>
          o.nextStep === nodeId ? { ...o, nextStep: "result" } : o
        );
        return { ...s, options: opts };
      });
    commit(next);
    setSelectedNodeId(null);
  };

  // Duplicar nodo (solo select)
  const duplicateNode = (nodeId) => {
    if (nodeId === "result") return;
    const src = steps.find((s) => s.id === nodeId && s.type === "select");
    if (!src) return;
    // Generar ID único basado en original
    const base = `${src.id}_copy`;
    let newId = base;
    let i = 1;
    while (steps.some((s) => s.id === newId)) {
      newId = `${base}_${i++}`;
    }
    // Posición desplazada
    const pos = src.pos || { x: 100, y: 160 };
    const newPos = { x: pos.x + 40, y: pos.y + 30 };
    const clone = {
      ...src,
      id: newId,
      pos: newPos,
      // clonar opciones por valor
      options: (src.options || []).map((o) => ({ ...o })),
    };
    const next = [
      ...steps.filter((s) => s.type === "select"),
      clone,
      steps[tplIndex],
    ];
    commit(next);
    setSelectedNodeId(newId);
  };

  // Conexión por arrastre — usa handle por opción (opt-idx)
  const onConnect = useCallback(
    (params) => {
      const { source, sourceHandle, target } = params || {};
      if (!source || !sourceHandle || !target) return;
      const m = String(sourceHandle).match(/^opt-(\d+)$/);
      if (!m) return;
      const optIdx = Number(m[1]);
      const next = steps.map((s) => {
        if (s.id !== source || s.type !== "select") return s;
        const opts = [...(s.options || [])];
        if (!opts[optIdx]) return s;
        opts[optIdx] = { ...opts[optIdx], nextStep: target };
        return { ...s, options: opts };
      });
      commit(next);
      setSelectedNodeId(source);
    },
    [steps, commit]
  );

  // Guardar posiciones al soltar (drag fluido ya visible en UI)
  const onNodeDragStop = (_evt, node) => {
    const { id, position } = node;
    const next = steps.map((s) =>
      s.id === id
        ? { ...s, pos: position }
        : s.type === "template" && id === "result"
        ? { ...s, pos: position }
        : s
    );
    commit(next);
    setSelectedNodeId(id);
  };

  // Cambios de nodos para drag fluido
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Panel de propiedades
  const selectedStep =
    steps.find((s) => s.id === selectedNodeId) ||
    (selectedNodeId === "result" ? steps[tplIndex] : null);

  const updateSelectedId = (newIdRaw) => {
    if (!selectedStep || selectedStep.type !== "select") return;
    const newId = sanitizeId(newIdRaw);
    if (!newId) return;
    if (newId === selectedStep.id) return;
    if (steps.some((s) => s.id === newId)) return alert("ID ya existe.");

    const oldId = selectedStep.id;
    const tokenRe = new RegExp(`\\{${oldId}\\}`, "g");
    const next = steps.map((s) => {
      if (s.id === oldId) return { ...s, id: newId };
      if (s.type === "template") {
        const tpl = s.template || "";
        const replaced = tpl.replace(tokenRe, `{${newId}}`);
        return { ...s, template: replaced };
      }
      if (s.type !== "select") return s;
      const options = (s.options || []).map((o) =>
        o.nextStep === oldId ? { ...o, nextStep: newId } : o
      );
      return { ...s, options };
    });
    commit(next);
    setSelectedNodeId(newId);
  };

  const updatePrompt = (v) => {
    if (!selectedStep || selectedStep.type !== "select") return;
    const next = steps.map((s) => (s.id === selectedStep.id ? { ...s, prompt: v } : s));
    commit(next);
    setSelectedNodeId(selectedStep.id);
  };

  const updateOption = (idx, partial) => {
    if (!selectedStep || selectedStep.type !== "select") return;
    const opts = [...(selectedStep.options || [])];
    opts[idx] = { ...opts[idx], ...partial };
    const next = steps.map((s) => (s.id === selectedStep.id ? { ...s, options: opts } : s));
    commit(next);
    setSelectedNodeId(selectedStep.id);
  };
  const addOption = () => {
    if (!selectedStep || selectedStep.type !== "select") return;
    const opts = [...(selectedStep.options || [])];
    opts.push({ label: "", value: "", nextStep: "result" });
    const next = steps.map((s) => (s.id === selectedNodeId ? { ...s, options: opts } : s));
    commit(next);
    setSelectedNodeId(selectedNodeId);
  };
  const removeOption = (idx) => {
    if (!selectedStep || selectedStep.type !== "select") return;
    const opts = [...(selectedStep.options || [])];
    opts.splice(idx, 1);
    const next = steps.map((s) => (s.id === selectedNodeId ? { ...s, options: opts } : s));
    commit(next);
    setSelectedNodeId(selectedNodeId);
  };

  const renderedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  return (
    <>
      {/* Panel derecho: 1fr + 340px en lg */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-3">
        {/* Canvas */}
        <div className="rounded-xl border border-blue-100 dark:border-slate-700 overflow-visible bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-between px-2 py-1 border-b border-blue-100 dark:border-slate-700">
            <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Flow</div>
            <div className="flex items-center gap-2">
              <button
                onClick={addVariable}
                className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"
                type="button"
              >
                + Añadir Variable
              </button>
              {selectedNodeId && selectedNodeId !== "result" && (
                <button
                  onClick={() => deleteNode(selectedNodeId)}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[12px] font-semibold text-red-700 hover:bg-red-100"
                  type="button"
                >
                  Eliminar Nodo
                </button>
              )}
              {selectedNodeId && selectedNodeId !== "result" && (
              <button
                onClick={() => duplicateNode(selectedNodeId)}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100"
                type="button"
              >
                Duplicar Nodo
              </button>
            )}
            </div>
          </div>

          {/* React Flow con Provider + canvas separado */}
          <ReactFlowProvider>
            <FlowCanvas
              nodes={renderedNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={{ bezier: BezierEdge }}
              onNodesChange={onNodesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={(n) => setSelectedNodeId(n?.id || null)}
              onPaneClick={() => setSelectedNodeId(null)}
            />
          </ReactFlowProvider>
        </div>

        {/* Panel de propiedades: ID + Título + Opciones (sin Next step) */}
        <aside className="space-y-3">
          {!selectedStep && (
            <div className="rounded-xl border border-blue-100 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3 text-[13px] text-slate-500">
              Selecciona un nodo para editar sus propiedades.
            </div>
          )}

          {selectedStep?.type === "select" && (
            <div className="rounded-xl border border-blue-100 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3 space-y-3">
              {/* ID editable */}
              <div>
                <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  ID de la variable
                </div>
                <input
                  className="w-full rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-300"
                  value={selectedStep.id}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault();
                      insertUnderscoreAtCaret(e, selectedStep.id, (v) => updateSelectedId(v));
                    }
                  }}
                  onChange={(e) => updateSelectedId(e.target.value)}
                  placeholder="id_variable"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Solo minúsculas, números, guion bajo (_) y guion (-).
                </p>
              </div>

              {/* Título (Pregunta) */}
              <div>
                <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Título de la variable (Pregunta)
                </div>
                <input
                  className="w-full rounded-md border border-blue-200/60 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-300"
                  value={selectedStep.prompt || ""}
                  onChange={(e) => updatePrompt(e.target.value)}
                  placeholder="¿Pregunta al usuario?"
                />
              </div>

              {/* Opciones en filas (label + value + eliminar) */}
              <div>
                <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Opciones
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                  <div className="space-y-1">
                    {(selectedStep.options || []).map((opt, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {/* Label */}
                        <input
                          className="flex-1 min-w-0 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-2 py-1.5 text-[13px] outline-none"
                          value={opt.label || ""}
                          onChange={(e) => updateOption(i, { label: e.target.value })}
                          placeholder="Título (label)"
                        />
                        {/* Value (insertado) como TEXTAREA auto-ajustable */}
                        <textarea
                          rows={1}
                          className="flex-1 min-w-0 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-300 resize-y overflow-hidden"
                          value={opt.value || ""}
                          onChange={(e) => updateOption(i, { value: e.target.value })}
                          onInput={(e) => autoResize(e.currentTarget)}
                          onFocus={(e) => autoResize(e.currentTarget)}
                          placeholder="Value (insertado)"
                          ref={(el) => autoResize(el)}
                        />
                        {/* Eliminar (X roja) */}
                        <button
                          className="ml-1 px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-[12px] font-semibold"
                          onClick={() => removeOption(i)}
                          type="button"
                          title="Eliminar opción"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    + Añadir opción
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedStep?.type === "template" && (
            <div className="rounded-xl border border-emerald-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3 space-y-1 text-[13px] text-slate-600 dark:text-slate-300">
              <b>result</b> seleccionado. La plantilla se edita en la barra superior.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

// === Canvas bajo ReactFlowProvider (usa useReactFlow sin romper) ===
function FlowCanvas({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onConnect,
  onNodeDragStop,
  onNodeClick,
  onPaneClick,
}) {
  const [flowHeight, setFlowHeight] = useState(600);
  const rf = useReactFlow();

  // Calcular altura basada en las posiciones de los nodos
  const calculateHeight = useCallback(() => {
    try {
      const allNodes = rf.getNodes?.() || nodes || [];
      
      if (allNodes.length === 0) {
        return 600; // Altura por defecto
      }

      // Encontrar el nodo más abajo
      let maxY = 0;
      let maxBottom = 0;
      
      for (const node of allNodes) {
        const nodeY = node.position.y;
        const nodeHeight = 120; // Altura estimada de un nodo
        const nodeBottom = nodeY + nodeHeight;
        
        if (nodeBottom > maxBottom) {
          maxBottom = nodeBottom;
        }
        if (nodeY > maxY) {
          maxY = nodeY;
        }
      }

      // Usar el mayor valor entre maxY y maxBottom, con un margen
      const calculatedHeight = Math.max(maxY, maxBottom) + 200;
      
      // Limitar la altura máxima para evitar crecimiento infinito
      const finalHeight = Math.min(Math.max(600, calculatedHeight), 2000);
      
      return finalHeight;
    } catch (error) {
      console.warn("Error calculando altura:", error);
      return 600;
    }
  }, [rf, nodes]);

  // Recalcular altura cuando cambien los nodos
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newHeight = calculateHeight();
      if (Math.abs(newHeight - flowHeight) > 50) { // Solo actualizar si hay cambio significativo
        setFlowHeight(newHeight);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [nodes, calculateHeight, flowHeight]);

  // Manejar el drag stop con recálculo
  const handleNodeDragStop = useCallback((evt, node) => {
    onNodeDragStop?.(evt, node);
    
    // Recalcular después del drag
    setTimeout(() => {
      const newHeight = calculateHeight();
      setFlowHeight(newHeight);
    }, 100);
  }, [onNodeDragStop, calculateHeight]);

  return (
    <div style={{ 
      height: flowHeight, 
      minHeight: 600,
      width: '100%',
      position: 'relative'
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(_, n) => onNodeClick?.(n)}
        onPaneClick={() => onPaneClick?.()}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 300 }}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnDoubleClick={false}
        panOnDrag
        selectionOnDrag={false}
        snapToGrid={false}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: "bezier" }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <MiniMap 
          zoomable 
          pannable 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
          }}
        />
        <Controls />
        <Background variant="lines" gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}