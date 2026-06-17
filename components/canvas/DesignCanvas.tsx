import ReactFlow, { addEdge, Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

export default function DesignCanvas({ elements, onElementsChange }) {
  return (
    <div className="h-[600px] w-full border rounded-lg">
      <ReactFlow
        elements={elements}
        onElementsChange={onElementsChange}
        onConnect={(params) => setElements((els) => addEdge(params, els))}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
