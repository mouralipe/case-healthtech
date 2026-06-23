"use client";

import { Button } from "@/components/ui/Button";

// Human-in-the-loop approval bar for sensitive actions.
// TODO: add "Edit arguments" before approving — opens the tool.input fields
// for editing and sends the adjusted values to /api/tools/execute.
export function ApprovalBar({
  onApprove,
  onReject,
}: {
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="mr-auto text-xs text-amber-700">
        This action modifies data. Approve?
      </span>
      <Button variant="ghost" onClick={onReject}>
        Reject
      </Button>
      <Button variant="primary" onClick={onApprove}>
        Approve
      </Button>
    </div>
  );
}
