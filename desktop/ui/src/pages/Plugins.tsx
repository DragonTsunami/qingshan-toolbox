import { Skeleton } from "antd";
import PluginPanel from "../components/PluginPanel";
import type { SystemSnapshot } from "../types";

interface PluginsProps {
  snapshot: SystemSnapshot | null;
}

export default function PluginsPage({ snapshot }: PluginsProps) {
  if (!snapshot) {
    return (
      <div className="page-stack">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PluginPanel snapshot={snapshot} />
    </div>
  );
}
