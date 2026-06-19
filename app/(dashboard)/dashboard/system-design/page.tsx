"use client";

import { useState, useCallback, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Database,
  Server,
  Globe,
  Shield,
  Zap,
  Box,
  MessageSquare,
  HardDrive,
  Cpu,
  Cloud,
  Layers,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  Plus,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Lock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// ─── Node Types Config ────────────────────────────────────────────────────────

const NODE_TYPES_CONFIG = [
  {
    type: "database",
    label: "Database",
    icon: Database,
    color: "bg-blue-500",
    border: "border-blue-300",
    text: "text-blue-700",
    bg: "bg-blue-50",
  },
  {
    type: "server",
    label: "Server",
    icon: Server,
    color: "bg-violet-500",
    border: "border-violet-300",
    text: "text-violet-700",
    bg: "bg-violet-50",
  },
  {
    type: "api",
    label: "API Gateway",
    icon: Globe,
    color: "bg-emerald-500",
    border: "border-emerald-300",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  {
    type: "cache",
    label: "Cache",
    icon: Zap,
    color: "bg-amber-500",
    border: "border-amber-300",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    type: "queue",
    label: "Message Queue",
    icon: MessageSquare,
    color: "bg-pink-500",
    border: "border-pink-300",
    text: "text-pink-700",
    bg: "bg-pink-50",
  },
  {
    type: "storage",
    label: "File Storage",
    icon: HardDrive,
    color: "bg-orange-500",
    border: "border-orange-300",
    text: "text-orange-700",
    bg: "bg-orange-50",
  },
  {
    type: "client",
    label: "Client",
    icon: Cpu,
    color: "bg-slate-500",
    border: "border-slate-300",
    text: "text-slate-700",
    bg: "bg-slate-50",
  },
  {
    type: "cloud",
    label: "Cloud Service",
    icon: Cloud,
    color: "bg-sky-500",
    border: "border-sky-300",
    text: "text-sky-700",
    bg: "bg-sky-50",
  },
  {
    type: "auth",
    label: "Auth Service",
    icon: Shield,
    color: "bg-red-500",
    border: "border-red-300",
    text: "text-red-700",
    bg: "bg-red-50",
  },
  {
    type: "loadbalancer",
    label: "Load Balancer",
    icon: Layers,
    color: "bg-teal-500",
    border: "border-teal-300",
    text: "text-teal-700",
    bg: "bg-teal-50",
  },
  {
    type: "microservice",
    label: "Microservice",
    icon: Box,
    color: "bg-indigo-500",
    border: "border-indigo-300",
    text: "text-indigo-700",
    bg: "bg-indigo-50",
  },
  {
    type: "monitoring",
    label: "Monitoring",
    icon: Activity,
    color: "bg-lime-500",
    border: "border-lime-300",
    text: "text-lime-700",
    bg: "bg-lime-50",
  },
] as const;

type NodeType = (typeof NODE_TYPES_CONFIG)[number]["type"];

const getNodeConfig = (type: string) =>
  NODE_TYPES_CONFIG.find((n) => n.type === type) ?? NODE_TYPES_CONFIG[1];

// ─── Custom Node Component ────────────────────────────────────────────────────

function CustomNode({ data, selected }: { data: any; selected: boolean }) {
  const config = getNodeConfig(data.type);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative min-w-[140px] rounded-xl border-2 shadow-sm transition-all duration-150 cursor-pointer",
        config.bg,
        config.border,
        selected &&
          "ring-2 ring-violet-500 ring-offset-2 shadow-md scale-[1.02]",
      )}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-white !bg-violet-500 !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !bg-violet-500 !-bottom-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-white !bg-violet-500 !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-white !bg-violet-500 !-right-1.5"
      />

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              config.color,
            )}
          >
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p
              className={cn("text-[11px] font-semibold truncate", config.text)}
            >
              {data.label}
            </p>
            <p className="text-[9px] text-muted-foreground">{config.label}</p>
          </div>
        </div>
        {data.description && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mt-1 border-t border-border/50 pt-1">
            {data.description}
          </p>
        )}
        {data.tech && (
          <span
            className={cn(
              "inline-block text-[9px] font-medium px-1.5 py-0.5 rounded mt-1.5",
              config.color,
              "text-white",
            )}
          >
            {data.tech}
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_NODES: Node[] = [
  {
    id: "1",
    type: "custom",
    position: { x: 300, y: 50 },
    data: {
      type: "client",
      label: "Web Client",
      description: "React / Next.js frontend",
      tech: "Next.js",
    },
  },
  {
    id: "2",
    type: "custom",
    position: { x: 300, y: 200 },
    data: {
      type: "api",
      label: "API Gateway",
      description: "Route & authenticate requests",
      tech: "Node.js",
    },
  },
  {
    id: "3",
    type: "custom",
    position: { x: 100, y: 360 },
    data: {
      type: "server",
      label: "App Server",
      description: "Business logic layer",
      tech: "Express",
    },
  },
  {
    id: "4",
    type: "custom",
    position: { x: 500, y: 360 },
    data: {
      type: "auth",
      label: "Auth Service",
      description: "JWT & OAuth with Clerk",
      tech: "Clerk",
    },
  },
  {
    id: "5",
    type: "custom",
    position: { x: 100, y: 520 },
    data: {
      type: "database",
      label: "MongoDB",
      description: "Primary NoSQL database",
      tech: "MongoDB",
    },
  },
  {
    id: "6",
    type: "custom",
    position: { x: 500, y: 520 },
    data: {
      type: "cache",
      label: "Redis Cache",
      description: "Session & query cache",
      tech: "Redis",
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
  },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
  },
  {
    id: "e3-6",
    source: "3",
    target: "6",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
  },
];

// ─── AI Dialog ────────────────────────────────────────────────────────────────

function AIDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (nodes: Node[], edges: Edge[]) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/system-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI failed");

      onApply(data.nodes, data.edges);
      setPrompt("");
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const EXAMPLES = [
    "E-commerce platform with payments and inventory",
    "Real-time chat app with WebSockets",
    "Video streaming service like YouTube",
    "Ride-sharing app like Uber",
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                AI Architecture Generator
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Describe your system — AI will generate the architecture
                diagram.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              What are you building?
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A social media app with real-time notifications, user authentication, post feed, and media uploads..."
              className="text-sm resize-none min-h-[100px]"
              rows={4}
            />
          </div>

          {/* Examples */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Quick examples
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-violet-50 hover:text-violet-600 border border-border hover:border-violet-200 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
              <X className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-row justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs px-4"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className="h-8 text-xs px-4 bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />{" "}
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Node Edit Panel ──────────────────────────────────────────────────────────

function NodeEditPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: {
  node: Node;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const config = getNodeConfig(node.data.type);
  const Icon = config.icon;

  return (
    <div className="w-64 bg-background border-l border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
              config.color,
            )}
          >
            <Icon className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium">Edit Node</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Label
            </label>
            <Input
              value={node.data.label}
              onChange={(e) =>
                onUpdate(node.id, { ...node.data, label: e.target.value })
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Type
            </label>
            <div className="grid grid-cols-2 gap-1">
              {NODE_TYPES_CONFIG.map((n) => {
                const NIcon = n.icon;
                return (
                  <button
                    key={n.type}
                    onClick={() =>
                      onUpdate(node.id, { ...node.data, type: n.type })
                    }
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all",
                      node.data.type === n.type
                        ? `${n.bg} ${n.border} ${n.text} font-medium`
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <NIcon className="w-3 h-3 shrink-0" />
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Technology
            </label>
            <Input
              value={node.data.tech ?? ""}
              onChange={(e) =>
                onUpdate(node.id, { ...node.data, tech: e.target.value })
              }
              placeholder="e.g. PostgreSQL, Redis..."
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              value={node.data.description ?? ""}
              onChange={(e) =>
                onUpdate(node.id, { ...node.data, description: e.target.value })
              }
              placeholder="What does this component do?"
              className="text-sm resize-none min-h-[70px]"
              rows={3}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            onDelete(node.id);
            onClose();
          }}
          className="w-full h-8 text-xs gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove Node
        </Button>
      </div>
    </div>
  );
}

// ─── Canvas (inner component — needs ReactFlow context) ───────────────────────

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const nodeId = useRef(100);

  // ── Connect edges ──
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
            style: { stroke: "#8b5cf6", strokeWidth: 2 },
            animated: false,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  // ── Node click ──
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ── Add node ──
  function addNode(type: NodeType) {
    const config = getNodeConfig(type);
    const id = `node_${++nodeId.current}`;
    const newNode: Node = {
      id,
      type: "custom",
      position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { type, label: config.label, description: "", tech: "" },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  // ── Update node ──
  function updateNode(id: string, data: any) {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
    setSelectedNode((prev) => (prev?.id === id ? { ...prev, data } : prev));
  }

  // ── Delete node ──
  function deleteNode(id: string) {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }

  // ── Clear canvas ──
  function clearCanvas() {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }

  // ── AI apply ──
  function applyAI(aiNodes: Node[], aiEdges: Edge[]) {
    setNodes(aiNodes.map((n) => ({ ...n, type: "custom" })));
    setEdges(aiEdges);
    setSelectedNode(null);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }

  // ── Export PNG ──
  function exportPNG() {
    const el = document.querySelector(".react-flow__renderer") as HTMLElement;
    if (!el) return;
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(el, { backgroundColor: "#ffffff", scale: 2 }).then(
        (canvas) => {
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = "system-design.png";
          a.click();
        },
      );
    });
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* ── LEFT SIDEBAR — Node palette ── */}
        <div className="w-52 border-r border-border flex flex-col shrink-0 bg-background">
          <div className="px-4 py-3 border-b">
            <h2 className="text-xs font-semibold tracking-tight">Components</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Drag or click to add
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {NODE_TYPES_CONFIG.map((n) => {
                const NIcon = n.icon;
                return (
                  <button
                    key={n.type}
                    onClick={() => addNode(n.type as NodeType)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left",
                      "transition-all hover:shadow-sm group",
                      n.bg,
                      n.border,
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                        n.color,
                      )}
                    >
                      <NIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className={cn("text-[11px] font-medium", n.text)}>
                      {n.label}
                    </span>
                    <Plus
                      className={cn(
                        "w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity",
                        n.text,
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Stats */}
          <div className="px-4 py-3 border-t space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Nodes</span>
              <span className="font-medium text-foreground">
                {nodes.length}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Connections</span>
              <span className="font-medium text-foreground">
                {edges.length}
              </span>
            </div>
          </div>
        </div>

        {/* ── MAIN CANVAS ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top toolbar */}
          <header className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 bg-background">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-violet-600" />
              <h1 className="text-sm font-semibold">System Design Canvas</h1>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                Beta
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => zoomIn()}
                    className="h-7 w-7 p-0"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => zoomOut()}
                    className="h-7 w-7 p-0"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fitView({ padding: 0.2 })}
                    className="h-7 w-7 p-0"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit view</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-5 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportPNG}
                    className="h-7 gap-1.5 text-xs px-2.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export as PNG</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    className="h-7 gap-1.5 text-xs px-2.5 text-destructive hover:text-destructive border-destructive/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear canvas</TooltipContent>
              </Tooltip>

              <Button
                size="sm"
                onClick={() => setAiOpen(true)}
                className="h-7 gap-1.5 text-xs px-3 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Generate
              </Button>
            </div>
          </header>

          {/* Canvas + optional edit panel */}
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                deleteKeyCode="Delete"
                className="bg-dot-pattern"
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#e2e8f0"
                />
                <Controls className="!bottom-4 !left-4 !shadow-sm !border !border-border !rounded-xl overflow-hidden" />
                <MiniMap
                  className="!bottom-4 !right-4 !border !border-border !rounded-xl overflow-hidden !shadow-sm"
                  nodeColor={(n) => {
                    const config = getNodeConfig(n.data?.type);
                    return config.color.replace("bg-", "").replace("-500", "");
                  }}
                  maskColor="rgba(0,0,0,0.05)"
                />

                {/* Empty state */}
                {nodes.length === 0 && (
                  <Panel position="top-center">
                    <div className="flex flex-col items-center gap-3 mt-20 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <GitBranch className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Canvas is empty</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Add components from the left panel or use AI to
                          generate
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAiOpen(true)}
                        className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Generate with AI
                      </Button>
                    </div>
                  </Panel>
                )}

                {/* Hint panel */}
                {nodes.length > 0 && (
                  <Panel position="bottom-center">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border text-[10px] text-muted-foreground shadow-sm mb-2">
                      <span>Click node to edit</span>
                      <span>·</span>
                      <span>Drag handles to connect</span>
                      <span>·</span>
                      <span>Delete key to remove</span>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </div>

            {/* Right edit panel */}
            {selectedNode && (
              <NodeEditPanel
                node={selectedNode}
                onUpdate={updateNode}
                onDelete={deleteNode}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </div>
        </div>

        {/* AI Dialog */}
        <AIDialog
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          onApply={applyAI}
        />
      </div>
    </TooltipProvider>
  );
}

// ─── Page (wrapped with ReactFlowProvider) ────────────────────────────────────

export default function SystemDesignPage() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
