import { createFileRoute } from "@tanstack/react-router";
import { CanvasErrorBoundary } from "@/components/crear/DesignCanvas";

function Boom(): never {
  throw new Error("fallo de dibujado de prueba");
}

export const Route = createFileRoute("/probe-temp")({
  component: () => (
    <div>
      <p>resto de la app viva</p>
      <CanvasErrorBoundary>
        <Boom />
      </CanvasErrorBoundary>
    </div>
  ),
});
