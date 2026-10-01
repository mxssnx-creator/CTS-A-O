import { createFileRoute } from "@tanstack/react-router";
import { StatisticsPage } from "@/components/v2/pages/statistics";

export const Route = createFileRoute("/v2/statistics")({
  component: StatisticsPage,
});
