// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { CanvasErrorBoundary } from "@/components/crear/DesignCanvas";

function Boom(): never { throw new Error("fallo de dibujado"); }

describe("CanvasErrorBoundary", () => {
  it("muestra mensaje amable y no tumba el resto de la app", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <div>
          <p>resto de la app</p>
          <CanvasErrorBoundary><Boom /></CanvasErrorBoundary>
        </div>,
      );
    });
    expect(host.textContent).toContain("No pudimos mostrar el editor");
    expect(host.textContent).toContain("resto de la app");
  });
});
