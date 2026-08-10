import { createFileRoute } from "@tanstack/react-router";
import { getGuideById } from "@/lib/guides/registry";

/** Versión descargable/adjuntable de una guía. El contenido es público. */
export const Route = createFileRoute("/api/public/guia/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const guide = getGuideById(params.id.replace(/\.md$/, ""));
        if (!guide) return new Response("Guía no encontrada", { status: 404 });

        const lines: string[] = [`# ${guide.title}`, "", guide.intro, ""];
        guide.steps.forEach((step, i) => {
          lines.push(`## ${i + 1}. ${step.title}`, "", step.body, "");
          if (step.done) lines.push(`_Sabrás que terminó cuando: ${step.done}_`, "");
        });
        lines.push("---", "", guide.help, "");

        return new Response(lines.join("\n"), {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename="${guide.id}.md"`,
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
