import { Button } from "@gravity/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gravity/ui/components/card";
import { formatTimestamp } from "../../lib/format";

type BridgeOfflineProps = {
  onRetry: () => void;
  info: { port: number; channel: string; startedAt: string } | null;
};

export default function BridgeOffline({ onRetry, info }: BridgeOfflineProps) {
  const diagnostics = JSON.stringify(
    {
      channel: info?.channel ?? null,
      port: info?.port ?? null,
      startedAt: info?.startedAt ?? null,
    },
    null,
    2,
  );

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnostics);
    } catch {
      // noop
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bridge offline</CardTitle>
          <CardDescription>Gravity could not connect to the local bridge.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Channel</span>
                <span className="text-foreground">{info?.channel ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last port</span>
                <span className="text-foreground">{info?.port ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Started</span>
                <span className="text-foreground">{formatTimestamp(info?.startedAt ?? null)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Make sure the app is running and try again.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={copyDiagnostics}>
                  Copy diagnostics
                </Button>
                <Button size="sm" onClick={onRetry}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
