import { PageHeader } from "@/components/dashboard/PageHeader";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="app-container-dashboard">
      <PageHeader
        title="Settings"
        description="Display, sound, and accessibility preferences for your study sessions."
        breadcrumbs={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Settings" },
        ]}
      />
      <SettingsPanel />
    </div>
  );
}
