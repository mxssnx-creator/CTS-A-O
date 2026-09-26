import { createFileRoute } from "@tanstack/react-router";
import { PresetsPage } from "@/components/v2/pages/presets";

export const Route = createFileRoute("/v2/presets")({
  component: PresetsPage,
});
