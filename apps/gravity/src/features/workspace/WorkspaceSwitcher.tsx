import { Button } from "@gravity/ui/components/button";

type WorkspaceSwitcherProps = {
  name: string;
  path: string;
  onPick: () => void;
};

export default function WorkspaceSwitcher({ name, path, onPick }: WorkspaceSwitcherProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Workspace</span>
        <span className="truncate text-sm font-medium text-foreground">{name || path}</span>
        <span className="truncate text-xs text-muted-foreground">{path}</span>
      </div>
      <Button size="sm" variant="outline" onClick={onPick}>
        Switch
      </Button>
    </div>
  );
}
