import { useState } from "react";

import { Button } from "@gravity/ui/components/button"

function App() {
	const [workflows, setWorkflows] = useState<any[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadWorkflows = async () => {
		setLoading(true);
		setError(null);
		
		try {
			const res = await fetch("http://localhost:5174/plan", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				// Testando com o diretório raiz do monorepo (6 níveis acima do bin de build)
				body: JSON.stringify({ workdir: "../../../../../../" }) 
			});

			const data = await res.json();
			if (data.error) {
				setError(data.error);
			} else {
				setWorkflows(data.result);
			}
		} catch (e: any) {
			setError(e.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<div>
				<h1>
					Gravity <span>Core</span>
				</h1>
				<p>
					Local Runtime Dashboard for nektos/act
				</p>

				<div>
					<div>
						<div>
							<h2>Workflows</h2>
							<p>Escaneando diretório local por arquivos do GitHub Actions</p>
						</div>
						<Button
							size= "lg"
							variant={"default"}
							onClick={loadWorkflows}
							disabled={loading}
						>
							{loading ? "Planejando..." : "Carregar Planos (Go)"}
						</Button>
					</div>

					{error && (
						<div>
							Erro: {error}
						</div>
					)}

					{workflows && (
						<div>
							{workflows.length === 0 ? (
								<p>Nenhum workflow encontrado.</p>
							) : (
								workflows.map((wf, i) => (
									<div key={i}>
										<h3>
											{wf.name || "Unnamed Workflow"}
										</h3>
										<p>{wf.file}</p>
										
										<div>
											{wf.jobs?.map((job: any, j: number) => (
												<div key={j}>
													<span>{job.name || job.id}</span>
													<span>job</span>
												</div>
											))}
										</div>
									</div>
								))
							)}
						</div>
					)}

					{!workflows && !loading && !error && (
						<div>
							<p>Clique em Carregar Planos para invocar o binário Go</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
