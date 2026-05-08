import WorkspaceEmptyState from "../../features/workspace/WorkspaceEmptyState";
import WorkspaceSearch from "../../features/workspace/WorkspaceSearch";
import { useWorkspace } from "../../hooks/useWorkspace";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gravity/ui/components/card";

export default function WorkspaceOnboardingPage() {
  const { pick } = useWorkspace();

  return (
    <div className="flex h-full flex-col gap-6 p-10">
      <div>
        <p className="text-xs text-muted-foreground">Workspace</p>
        <h1 className="text-lg font-semibold text-foreground">Select a workspace</h1>
        <p className="text-xs text-muted-foreground">
          Gravity stores local state in .gravity/ inside your workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find a workspace</CardTitle>
          <CardDescription>Search or pick a project folder.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <WorkspaceSearch onPick={pick} />
            <WorkspaceEmptyState onPick={pick} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
