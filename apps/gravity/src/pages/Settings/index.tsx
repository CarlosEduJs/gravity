import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gravity/ui/components/card";

export default function SettingsPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Settings</CardTitle>
				<CardDescription>Workspace preferences will live here.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-xs text-muted-foreground">
					Settings are managed per workspace via .gravity/config.json.
				</p>
			</CardContent>
		</Card>
	);
}
