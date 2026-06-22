import type { Dispatch, SetStateAction } from "react";
import ReactFlow, { addEdge, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

type DesignCanvasProps = {
  nodes: any[];
  edges: any[];
  onNodesChange: Dispatch<SetStateAction<any[]>>;
  onEdgesChange: Dispatch<SetStateAction<any[]>>;
};

export default function DesignCanvas({ nodes, edges, onNodesChange, onEdgesChange }: DesignCanvasProps) {
  return (
    <div className="h-[600px] w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(params) => onEdgesChange((eds) => addEdge(params, eds))}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
