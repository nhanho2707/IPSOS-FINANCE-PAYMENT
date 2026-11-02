import React from "react";
import { Box, Button, MenuItem, Step, StepLabel, Stepper, TextField, Tooltip, Typography } from "@mui/material";
import { Add, CheckCircleOutline, Close, DeleteOutline, EditOutlined, Link as LinkIcon, Send, Undo } from "@mui/icons-material";
import { QuotationVersionData } from "../../../config/QuotationConfig";
import { getStatusTone, QUOTATION_STATUS_TONE } from "../../../config/ThemeConfig";
import { formatDate, formatStatus } from "../../../utils/format";
import StatusChip from "../../../components/StatusChip";
import RowActions, { RowActionItem } from "../../../components/Table/RowActions";

interface QuotationVersionHeaderProps {
    versions: QuotationVersionData[];
    selectedVersion: QuotationVersionData;
    onSelectVersion: (version: QuotationVersionData | null) => void;
    isEditing: boolean;
    canMutate: boolean;
    canEdit: boolean;
    canApprove: boolean;
    hasPendingFeedback: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onSubmit: () => void;
    onWithdraw: () => void;
    onApprove: () => void;
    onConfirmFm: () => void;
    onNewVersion: () => void;
    onCopyLink: () => void;
}

const STEPS = ["draft", "submitted", "fm_confirmed", "approved"] as const;
const STEP_LABELS: Record<typeof STEPS[number], string> = {
    draft: "Draft",
    submitted: "Submitted",
    fm_confirmed: "FM review",
    approved: "Approved",
};

const who = (name: string | undefined, date: Date | null | undefined) =>
    [name, date ? formatDate(date) : null].filter(Boolean).join(" · ") || "—";

// Who did each step and when, or who the version is waiting on.
const stepCaption = (step: typeof STEPS[number], version: QuotationVersionData, current: number): string => {
    const index = STEPS.indexOf(step);
    const done = index < current;
    const waiting = index === current;

    switch (step) {
        case "draft":
            return who(version.created_user?.name, version.created_at);
        case "submitted":
            return done ? `By ${version.created_user?.name ?? "—"}` : "Not submitted yet";
        case "fm_confirmed":
            return done ? who(version.fm_confirmed_user?.name, version.fm_confirmed_at) : waiting ? "Waiting for the Field Manager" : "";
        case "approved":
            return done ? who(version.approved_user?.name, version.approved_at) : waiting ? "Waiting for approval" : "";
    }
};

const QuotationVersionHeader: React.FC<QuotationVersionHeaderProps> = ({
    versions,
    selectedVersion,
    onSelectVersion,
    isEditing,
    canMutate,
    canEdit,
    canApprove,
    hasPendingFeedback,
    onEdit,
    onCancelEdit,
    onDelete,
    onSubmit,
    onWithdraw,
    onApprove,
    onConfirmFm,
    onNewVersion,
    onCopyLink,
}) => {
    const status = selectedVersion.status;
    const stepIndex = Math.max(0, STEPS.indexOf(status as typeof STEPS[number]));
    // A draft is still being worked on; once submitted, every step up to the current status is done.
    const activeStep = status === "draft" ? 0 : stepIndex + 1;
    const researcherCanAct = canMutate && canEdit;
    const shared = ["submitted", "fm_confirmed", "approved"].includes(status);

    const primaryAction = (() => {
        if (isEditing) return null;
        if (researcherCanAct && status === "draft") {
            return <Button variant="contained" startIcon={<Send />} onClick={onSubmit}>Submit for review</Button>;
        }
        if (researcherCanAct && status === "fm_confirmed" && canApprove) {
            return <Button variant="contained" startIcon={<CheckCircleOutline />} onClick={onApprove}>Approve</Button>;
        }
        if (!canMutate && status === "submitted") {
            return (
                <Tooltip title={hasPendingFeedback ? "Some feedback is still open. The researcher must resolve or reject all of it before the FM review can be confirmed." : ""}>
                    <span>
                        <Button variant="contained" startIcon={<CheckCircleOutline />} onClick={onConfirmFm} disabled={hasPendingFeedback}>
                            Confirm FM review
                        </Button>
                    </span>
                </Tooltip>
            );
        }
        return null;
    })();

    const menuItems: RowActionItem[] = researcherCanAct ? [
        { label: "Create new version", icon: Add, onClick: onNewVersion, disabled: isEditing },
        { label: "Withdraw to draft", icon: Undo, onClick: onWithdraw, hidden: status !== "submitted", disabled: isEditing },
        { label: "Withdraw to submitted", icon: Undo, onClick: onWithdraw, hidden: status !== "fm_confirmed", disabled: isEditing },
        { label: "Delete draft", icon: DeleteOutline, tone: "danger", onClick: onDelete, hidden: status !== "draft", disabled: isEditing },
    ] : [];

    return (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper" }}>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, px: 2.5, py: 1.75 }}>
                <TextField
                    select
                    size="small"
                    label="Version"
                    value={selectedVersion.id}
                    disabled={isEditing}
                    onChange={(event) => onSelectVersion(versions.find(v => v.id === Number(event.target.value)) ?? null)}
                    SelectProps={{ renderValue: () => `Version ${selectedVersion.version}` }}
                    sx={{ width: 160 }}
                >
                    {versions.map((v) => (
                        <MenuItem key={v.id} value={v.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <span>Version {v.version}</span>
                            <StatusChip label={formatStatus(v.status)} tone={getStatusTone(v.status, QUOTATION_STATUS_TONE)} />
                        </MenuItem>
                    ))}
                </TextField>
                <StatusChip label={formatStatus(status)} tone={getStatusTone(status, QUOTATION_STATUS_TONE)} />
                {isEditing && (
                    <Typography variant="body2" color="text.secondary">Editing: save the form below to keep your changes.</Typography>
                )}

                <Box sx={{ ml: "auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    {shared && (
                        <Button variant="outlined" color="inherit" startIcon={<LinkIcon />} onClick={onCopyLink}>
                            Copy link
                        </Button>
                    )}
                    {researcherCanAct && status === "draft" && (
                        isEditing ? (
                            <Button variant="outlined" color="inherit" startIcon={<Close />} onClick={onCancelEdit}>Cancel editing</Button>
                        ) : (
                            <Button variant="outlined" color="inherit" startIcon={<EditOutlined />} onClick={onEdit}>Edit</Button>
                        )
                    )}
                    {menuItems.length > 0 && (
                        // RowActions fills its table cell; here it should only take the width of its button.
                        <Box sx={{ display: "inline-flex" }}>
                            <RowActions menuLabel="More quotation actions" items={menuItems} />
                        </Box>
                    )}
                    {primaryAction}
                </Box>
            </Box>

            <Box sx={{ px: 2.5, pt: 2, pb: 2.25, borderTop: 1, borderColor: "divider" }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {STEPS.map((step) => (
                        <Step key={step}>
                            <StepLabel
                                optional={
                                    <Typography variant="caption" color="text.secondary" component="div" sx={{ textAlign: "center" }}>
                                        {stepCaption(step, selectedVersion, activeStep)}
                                    </Typography>
                                }
                                sx={{ "& .MuiStepLabel-label": { typography: "body2", fontWeight: 500 } }}
                            >
                                {STEP_LABELS[step]}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>
        </Box>
    );
};

export default QuotationVersionHeader;
