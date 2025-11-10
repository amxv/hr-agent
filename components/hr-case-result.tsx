"use client";

import {
	Loader2,
	Ticket,
	Clock,
	CheckCircle,
	AlertCircle,
	MessageSquare,
	Paperclip,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type {
	HRCaseInput,
	HRCaseOutput,
} from "@/lib/ai/tools/hr-case";

type HRCaseResultProps = {
	state: "input-available" | "output-available";
	input: HRCaseInput;
	output?: HRCaseOutput;
};

const STATUS_COLORS: Record<string, string> = {
	new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	assigned:
		"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	in_progress:
		"bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
	pending_employee:
		"bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
	resolved:
		"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
	low: "border-gray-300",
	medium: "border-blue-400",
	high: "border-amber-400",
	urgent: "border-red-400",
};

export function HRCaseResult({ state, input, output }: HRCaseResultProps) {
	// ===== LOADING STATE =====
	if (state === "input-available") {
		return (
			<div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-purple-900 text-sm dark:border-purple-800 dark:bg-purple-950 dark:text-purple-100">
				<Loader2 className="h-4 w-4 animate-spin" />
				<span>
					{input.action === "create" && "Creating HR case..."}
					{input.action === "status" && "Retrieving case status..."}
					{input.action === "list" && "Loading your cases..."}
				</span>
			</div>
		);
	}

	// ===== RESULT STATE =====
	if (state === "output-available" && output) {
		// ERROR STATE
		if ("error" in output) {
			return (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 text-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100">
					<p className="font-medium">Error</p>
					<p className="mt-1 text-xs opacity-90">{output.error}</p>
				</div>
			);
		}

		// ===== CREATE ACTION =====
		if (output.action === "create") {
			const { case: hrCase, message } = output;
			return (
				<Card className={`border-l-4 ${PRIORITY_COLORS[hrCase.priority]}`}>
					<div className="p-4 space-y-3">
						{/* Success Message */}
						<div className="flex items-start gap-2 text-green-700 dark:text-green-400">
							<CheckCircle className="h-5 w-5 mt-0.5" />
							<div>
								<p className="font-medium">Case Created Successfully</p>
								<p className="text-sm mt-0.5">{message}</p>
							</div>
						</div>

						<Separator />

						{/* Case Details */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Ticket className="h-4 w-4 text-muted-foreground" />
									<span className="font-mono font-medium text-sm">
										{hrCase.caseId}
									</span>
								</div>
								<div className="flex gap-2">
									<Badge className={STATUS_COLORS[hrCase.status]}>
										{hrCase.status.replace(/_/g, " ")}
									</Badge>
									<Badge variant="outline" className="capitalize">
										{hrCase.priority}
									</Badge>
								</div>
							</div>

							<div>
								<p className="font-medium text-sm">{hrCase.subject}</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Assigned to: {hrCase.assignedTeam}
								</p>
							</div>

							{hrCase.attachments && hrCase.attachments.length > 0 && (
								<div className="flex items-center gap-1 text-xs text-muted-foreground">
									<Paperclip className="h-3 w-3" />
									<span>{hrCase.attachments[0]}</span>
								</div>
							)}
						</div>

						{/* SLA Timeline */}
						<Card className="bg-muted/50 p-3">
							<div className="flex items-center gap-2 text-sm mb-2">
								<Clock className="h-4 w-4" />
								<span className="font-medium">Expected Timeline</span>
							</div>
							<div className="text-xs space-y-1">
								<p>
									First response by:{" "}
									<span className="font-medium">
										{new Date(hrCase.sla.firstResponseDue).toLocaleString()}
									</span>
								</p>
								<p>
									Resolution by:{" "}
									<span className="font-medium">
										{new Date(hrCase.sla.resolutionDue).toLocaleString()}
									</span>
								</p>
							</div>
						</Card>
					</div>
				</Card>
			);
		}

		// ===== STATUS ACTION =====
		if (output.action === "status") {
			const hrCase = output.case;
			return (
				<Card className={`border-l-4 ${PRIORITY_COLORS[hrCase.priority]}`}>
					<div className="p-4 space-y-3">
						{/* Case Header */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Ticket className="h-4 w-4 text-muted-foreground" />
									<span className="font-mono font-medium text-sm">
										{hrCase.caseId}
									</span>
								</div>
								<div className="flex gap-2">
									<Badge className={STATUS_COLORS[hrCase.status]}>
										{hrCase.status.replace(/_/g, " ")}
									</Badge>
									<Badge variant="outline" className="capitalize">
										{hrCase.priority}
									</Badge>
									<Badge variant="secondary" className="capitalize">
										{hrCase.category}
									</Badge>
								</div>
							</div>

							<div>
								<p className="font-medium">{hrCase.subject}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{hrCase.description}
								</p>
							</div>

							<div className="flex items-center gap-4 text-xs text-muted-foreground">
								<span>
									Created: {new Date(hrCase.createdDate).toLocaleDateString()}
								</span>
								{hrCase.assignedTo && (
									<span>Assigned to: {hrCase.assignedTo}</span>
								)}
							</div>
						</div>

						{/* SLA Status */}
						{hrCase.status !== "resolved" && hrCase.status !== "closed" && (
							<Card className="bg-muted/50 p-3">
								<div className="flex items-center gap-2 text-sm mb-2">
									<Clock className="h-4 w-4" />
									<span className="font-medium">SLA Status</span>
								</div>
								<div className="text-xs space-y-1">
									<div className="flex items-center justify-between">
										<span>First response:</span>
										{hrCase.sla.firstResponseMet ? (
											<Badge variant="outline" className="text-green-700">
												<CheckCircle className="h-3 w-3 mr-1" />
												Met
											</Badge>
										) : (
											<Badge variant="outline" className="text-amber-700">
												<AlertCircle className="h-3 w-3 mr-1" />
												Pending
											</Badge>
										)}
									</div>
									<div className="flex items-center justify-between">
										<span>Resolution due:</span>
										<span className="font-medium">
											{hrCase.sla.hoursRemaining}h remaining
										</span>
									</div>
								</div>
							</Card>
						)}

						{/* Case Updates Timeline */}
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm font-medium">
								<MessageSquare className="h-4 w-4" />
								<span>
									Updates ({hrCase.updates.filter((u) => !u.isInternal).length})
								</span>
							</div>
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{hrCase.updates
									.filter((update) => !update.isInternal)
									.map((update, idx) => (
										<Card key={idx} className="p-3 bg-muted/30">
											<div className="flex items-start justify-between mb-1">
												<span className="font-medium text-xs capitalize">
													{update.author}
												</span>
												<span className="text-xs text-muted-foreground">
													{new Date(update.timestamp).toLocaleString()}
												</span>
											</div>
											<p className="text-xs">{update.message}</p>
										</Card>
									))}
							</div>
						</div>
					</div>
				</Card>
			);
		}

		// ===== LIST ACTION =====
		if (output.action === "list") {
			const { cases, totalOpen, totalClosed } = output;
			return (
				<div className="space-y-3">
					{/* Summary */}
					<div className="flex gap-2">
						<Badge variant="outline">
							{totalOpen} Open Case{totalOpen !== 1 ? "s" : ""}
						</Badge>
						<Badge variant="secondary">{totalClosed} Closed</Badge>
					</div>

					{/* Cases List */}
					<div className="space-y-2">
						{cases.map((hrCase) => (
							<Card
								key={hrCase.caseId}
								className={`p-3 border-l-4 ${PRIORITY_COLORS[hrCase.priority]}`}
							>
								<div className="flex items-start justify-between">
									<div className="space-y-1 flex-1">
										<div className="flex items-center gap-2">
											<span className="font-mono text-xs">
												{hrCase.caseId}
											</span>
											<Badge className={STATUS_COLORS[hrCase.status]}>
												{hrCase.status.replace(/_/g, " ")}
											</Badge>
										</div>
										<p className="font-medium text-sm">{hrCase.subject}</p>
										<p className="text-xs text-muted-foreground">
											{hrCase.assignedTeam} •{" "}
											{new Date(hrCase.createdDate).toLocaleDateString()}
										</p>
									</div>
									<Badge variant="outline" className="capitalize text-xs">
										{hrCase.category}
									</Badge>
								</div>
							</Card>
						))}
					</div>
				</div>
			);
		}
	}

	return null;
}
