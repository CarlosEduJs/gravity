import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gravity/ui/components/card";

export default function HistoryPage() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>History</CardTitle>
				<CardDescription>Past runs will appear here.</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-xs text-muted-foreground">
					This section will include filters and run history.
				</p>
			</CardContent>
		</Card>
	);
}
