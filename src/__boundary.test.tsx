import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CanvasErrorBoundary } from "@/components/crear/DesignCanvas";

function Boom(): JSX.Element { throw new Error("fallo de dibujado"); }

describe("CanvasErrorBoundary", () => {
  it("muestra mensaje amable y no propaga", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <p>resto de la app</p>
        <CanvasErrorBoundary><Boom /></CanvasErrorBoundary>
      </div>,
    );
    expect(screen.getByText(/No pudimos mostrar el editor/i)).toBeTruthy();
    expect(screen.getByText("resto de la app")).toBeTruthy();
  });
});
