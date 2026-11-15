import React from "react";
import { Box, Button, Typography } from "@mui/material";
import dayjs from "dayjs";
import { NEUTRAL, STATUS_TONES } from "../../config/ThemeConfig";
import { formatMinutes, INTERVIEW_GIFT_STATUS, InterviewRow } from "../../config/StatisticsConfig";
import { formatDateTime, formatMoney, formatPhone } from "../../utils/format";
import DetailDrawer from "../DetailDrawer";
import ProviderBadge from "../ProviderBadge";
import StatusChip from "../StatusChip";

interface InterviewDrawerProps {
    interview: InterviewRow | null;
    onClose: () => void;
    showProject: boolean;
    // Left out when the page is already filtered to this interviewer.
    onFilterEmployee?: (code: string) => void;
}

interface TimelineStep {
    label: string;
    time: string | null;
    note?: string;
    alert?: boolean;
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <Box sx={{ display: "flex", gap: 2, py: 0.875, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
        <Typography variant="body2" sx={{ width: 132, flexShrink: 0, color: "text.secondary" }}>{label}</Typography>
        <Typography variant="body2" component="div" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>{children}</Typography>
    </Box>
);

const waitNote = (interview: InterviewRow): string | undefined => {
    if (interview.offline) return "Imported offline, so the wait is not measured";
    if (interview.wait_minutes === null) return undefined;
    if (interview.wait_minutes < 0) return `${formatMinutes(-interview.wait_minutes)} before the interview ended`;
    return `${formatMinutes(interview.wait_minutes)} after the interview ended`;
};

// One interview from start to gift, so a suspicious wait can be read in order.
const InterviewDrawer: React.FC<InterviewDrawerProps> = ({ interview, onClose, showProject, onFilterEmployee }) => {
    if (!interview) return <DetailDrawer open={false} onClose={onClose} title="">{null}</DetailDrawer>;

    const status = INTERVIEW_GIFT_STATUS[interview.gift_status];
    const length = interview.interview_start && interview.interview_end && !interview.offline
        ? dayjs(interview.interview_end).diff(dayjs(interview.interview_start), "minute")
        : null;

    const steps: TimelineStep[] = [
        { label: interview.offline ? "Imported" : "Interview started", time: interview.interview_start },
        ...(interview.offline ? [] : [{ label: "Interview ended", time: interview.interview_end, note: length !== null ? `${formatMinutes(length)} long` : undefined }]),
        { label: interview.gifted ? "Gift received" : "No gift", time: interview.gift_time, note: interview.gifted ? waitNote(interview) : status.label, alert: interview.needs_review },
    ];

    // The gift is listed first when it went out before the interview ended, which is the whole point of the review.
    const ordered = [...steps].sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0));

    return (
        <DetailDrawer
            open
            onClose={onClose}
            title={interview.respondent_id || "Interview"}
            subtitle={showProject ? [interview.project_code, interview.project_name].filter(Boolean).join(" · ") : formatPhone(interview.phone)}
            footer={interview.employee_id && onFilterEmployee ? (
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                        onFilterEmployee(interview.employee_id as string);
                        onClose();
                    }}
                >
                    Show only {interview.employee_id}
                </Button>
            ) : undefined}
        >
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 2.5 }}>
                <ProviderBadge provider={interview.channel} />
                <StatusChip label={status.label} tone={status.tone} />
                {interview.needs_review && <StatusChip label="Needs review" tone="danger" tooltip="The gift was sent before the interview ended" />}
                {interview.offline && <StatusChip label="Offline import" tone="neutral" />}
            </Box>

            <Typography variant="h3" component="h3" sx={{ mb: 1.5 }}>Timeline</Typography>
            <Box component="ol" sx={{ listStyle: "none", m: 0, mb: 3, p: 0 }}>
                {ordered.map((step, index) => (
                    <Box component="li" key={step.label} sx={{ position: "relative", display: "flex", gap: 1.5, pb: index === ordered.length - 1 ? 0 : 2.25 }}>
                        {index < ordered.length - 1 && (
                            <Box sx={{ position: "absolute", left: 5, top: 14, bottom: 0, width: 2, bgcolor: NEUTRAL[200] }} />
                        )}
                        <Box sx={{ width: 12, height: 12, mt: 0.375, borderRadius: "50%", flexShrink: 0, bgcolor: step.alert ? STATUS_TONES.danger.dot : step.time ? "primary.main" : NEUTRAL[300] }} />
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.label}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                                {step.time ? formatDateTime(step.time) : "—"}
                            </Typography>
                            {step.note && (
                                <Typography variant="body2" sx={{ color: step.alert ? STATUS_TONES.danger.fg : "text.secondary", fontWeight: step.alert ? 600 : 400 }}>
                                    {step.note}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                ))}
            </Box>

            <Typography variant="h3" component="h3" sx={{ mb: 0.5 }}>Details</Typography>
            <Field label="Respondent ID">{interview.respondent_id || "—"}</Field>
            <Field label="Phone">{formatPhone(interview.phone)}</Field>
            <Field label="Interviewer">{[interview.employee_id, interview.employee_name].filter(Boolean).join(" · ") || "—"}</Field>
            {showProject && <Field label="Project">{[interview.project_code, interview.project_name].filter(Boolean).join(" · ") || "—"}</Field>}
            <Field label="Gift value">{interview.gifted ? formatMoney(interview.amount) : "—"}</Field>
        </DetailDrawer>
    );
};

export default InterviewDrawer;
