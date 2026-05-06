import { Button } from "@gravity/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@gravity/ui/components/empty";

type WorkspaceEmptyStateProps = {
	onPick: () => void;
};

export default function WorkspaceEmptyState({ onPick }: WorkspaceEmptyStateProps) {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyTitle>No workspace selected</EmptyTitle>
				<EmptyDescription>
					Pick a project folder to start planning and running workflows.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button onClick={onPick}>Choose workspace</Button>
			</EmptyContent>
		</Empty>
	);
}
