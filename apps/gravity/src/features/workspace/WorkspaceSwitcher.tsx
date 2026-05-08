import { Button } from "@gravity/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@gravity/ui/components/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { useSidebar } from "@gravity/ui/components/sidebar";
import { cn } from "@gravity/ui/lib/utils";
import type { Workspace } from "../../types/core";

type WorkspaceSwitcherProps = {
  name: string;
  path: string;
  onPick: () => void;
  onSelect: (path: string) => void;
  workspaces: Workspace[];
};

export default function WorkspaceSwitcher({
  name,
  path,
  onPick,
  onSelect,
  workspaces,
}: WorkspaceSwitcherProps) {
  const { open } = useSidebar();
  const recentWorkspaces = workspaces.filter((item) => item.path).slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-0.5 w-fit hover:bg-accent-foreground">
        <WorkspaceIdentity name={name} path={path} showName={open} />
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn("w-5 transition-transform duration-300", !open && "w-3")}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={"w-52"}>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Settings <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Switch Workspace <DropdownMenuShortcut>⌘W</DropdownMenuShortcut>
            </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className={"w-56 flex flex-col gap-2"}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{path}</DropdownMenuLabel>
                  <div className="flex flex-col gap-2 px-1">
                    {recentWorkspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => onSelect(workspace.path)}
                        className={"group"}
                      >
                        <WorkspaceIdentity
                          name={workspace.name}
                          path={workspace.path}
                          showName={true}
                          avatarClassName="group-hover:bg-background"
                        />
                        {workspace.path === path && (
                          <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            className="size-4 absolute right-2"
                          />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuGroup>
                <Button variant={"outline"} size={"sm"} onClick={onPick}>
                  Pick Workspace <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                </Button>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface WorkspaceIdentityProps {
  name: string;
  showName?: boolean;
  path: string;
  className?: string;
  avatarClassName?: string;
}

function WorkspaceIdentity({ name, path, showName, className, avatarClassName }: WorkspaceIdentityProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-4 h-4 bg-primary rounded-full flex items-center justify-center text-background text-xs font-medium", avatarClassName)}>
        {name ? name[0].toUpperCase() : "?"}
      </div>
      {showName && <h2 className="font-semibold">{name || path}</h2>}
    </div>
  );
}
