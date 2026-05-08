import { useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@gravity/ui/components/command";

type WorkspaceSearchProps = {
  placeholder?: string;
  onPick: () => void;
};

export default function WorkspaceSearch({ placeholder, onPick }: WorkspaceSearchProps) {
  const [query, setQuery] = useState("");

	const helperText = useMemo(() => {
		if (!query) return "Pick a workspace to start.";
		return "No matches. Use the picker to choose a folder.";
	}, [query]);

  return (
    <Command>
      <CommandInput
        placeholder={placeholder ?? "Search workspaces"}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{helperText}</CommandEmpty>
				<CommandGroup heading="Actions">
					<CommandItem onSelect={onPick}>Pick a folder</CommandItem>
				</CommandGroup>
			</CommandList>
		</Command>
	);
}
