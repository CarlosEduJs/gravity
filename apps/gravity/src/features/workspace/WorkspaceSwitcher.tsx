import { Button } from "@gravity/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@gravity/ui/components/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useSidebar } from "@gravity/ui/components/sidebar";
import { cn } from "@gravity/ui/lib/utils";

type WorkspaceSwitcherProps = {
  name: string;
  path: string;
  onPick: () => void;
};

export function WorkspaceSwitcher({ name, path, onPick }: WorkspaceSwitcherProps) {
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

export function WorkspaceSwitcherNew({ name, path, onPick }: WorkspaceSwitcherProps) {
  const { open } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-0.5 w-fit hover:bg-accent-foreground">
        <WorkspaceIdentity name={name} path={path} open={open} />
        <HugeiconsIcon icon={ArrowDown01Icon} className={cn("w-5 transition-transform duration-300", !open && "w-3")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={"w-52"}>
        <DropdownMenuGroup>
          <DropdownMenuItem>Settings <DropdownMenuShortcut>⌘S</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Switch Workspace <DropdownMenuShortcut>⌘W</DropdownMenuShortcut></DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={"w-52 flex flex-col gap-2"}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{path}</DropdownMenuLabel>
                <div className="flex-col gap-2 px-1.5">
                  <WorkspaceIdentity name={name} path={path} open={open} />
                </div>
              </DropdownMenuGroup>
              <DropdownMenuItem onClick={onPick}>
                Pick Workspace <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface WorkspaceIdentityProps {
  name: string;
  path: string;
  open: boolean;
}

function WorkspaceIdentity({ name, path, open }: WorkspaceIdentityProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center text-background text-xs font-medium">
        {name ? name[0].toUpperCase() : "?"}
      </div>
      {open && <h2 className="font-semibold">{name || path}</h2>}
    </div>
  );
}