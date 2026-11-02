import { Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, TableCell, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { memo, useMemo, useState } from "react";
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { FieldSchema } from "../../../utils/renderFields";
import { useInputRule } from "../../../hook/useInputRule";
import { FeedbackThread, FeedbackThreadEntry } from "../../../config/QuotationConfig";
import { formatDateTime, formatStatus } from "../../../utils/format";
import StatusChip from "../../../components/StatusChip";
import { FEEDBACK_STATUS_TONE, getStatusTone } from "../../../config/ThemeConfig";

export interface RepeaterRowData {
    [key: string]: any
};

type Props = {
    row: {
        id: string,
        label: string,
        value: RepeaterRowData[],
        fields: FieldSchema[]
    };
    isEditing: boolean;
    onChange: (id: string, data: RepeaterRowData[]) => void;
    feedbackThread?: FeedbackThread;
    onFeedbackSave?: (content: string) => void | Promise<any>;
    onFeedbackResponse?: (status: 'resolved' | 'rejected', content: string) => void | Promise<any>;
};

function getThreadStatus(thread?: FeedbackThread): 'none' | 'pending' | 'resolved' | 'rejected' {
    if (!thread || !Array.isArray(thread) || thread.length === 0) return 'none';
    const last = thread[thread.length - 1];
    if (last.type === 'feedback') return 'pending';
    return last.status ?? 'none';
}

function rejectionTooltip(thread: FeedbackThread): string {
    const lastRejection = [...thread].reverse().find(e => e.type === 'response' && e.status === 'rejected');
    return lastRejection?.content ? `Reason: ${lastRejection.content}` : 'Rejected';
}

function statusColor(status: ReturnType<typeof getThreadStatus>): string {
    if (status === 'pending') return 'warning.main';
    if (status === 'resolved') return 'success.main';
    if (status === 'rejected') return 'error.main';
    return 'action.disabled';
}

function ThreadBubble({ entry }: { entry: FeedbackThreadEntry }) {
    const isFeedback = entry.type === 'feedback';
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isFeedback ? 'flex-start' : 'flex-end',
                mb: 1.5,
            }}
        >
            <Box
                sx={{
                    maxWidth: '85%',
                    bgcolor: isFeedback ? 'grey.100' : 'primary.50',
                    border: '1px solid',
                    borderColor: isFeedback ? 'grey.300' : 'primary.200',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                }}
            >
                {!isFeedback && entry.status && (
                    <Box sx={{ mb: 0.5 }}>
                        <StatusChip label={formatStatus(entry.status)} tone={getStatusTone(entry.status, FEEDBACK_STATUS_TONE)} />
                    </Box>
                )}
                {entry.content && (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {entry.content}
                    </Typography>
                )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, px: 0.5 }}>
                {entry.user_name} · {formatDateTime(entry.created_at)}
            </Typography>
        </Box>
    );
}

const RepeaterRow = memo(({ row, isEditing, onChange, feedbackThread, onFeedbackSave, onFeedbackResponse}: Props) => {

    const [ draft, setDraft ] = useState<RepeaterRowData>({});
    const [ feedbackOpen, setFeedbackOpen ] = useState(false);
    const [ feedbackText, setFeedbackText ] = useState('');
    const [ responseText, setResponseText ] = useState('');

    const repeaterRows = Array.isArray(row.value) ? row.value : [];

    const safeThread = Array.isArray(feedbackThread) ? feedbackThread : [];
    const threadStatus = getThreadStatus(safeThread);
    const showIcon = onFeedbackSave || onFeedbackResponse || safeThread.length > 0;
    const lastEntry = safeThread.length ? safeThread[safeThread.length - 1] : null;
    const canRespond = onFeedbackResponse && lastEntry?.type === 'feedback';

    const isDraftValid = useMemo(() => {
        return row.fields.every(field => {
            const value = draft[field.name];
            if(field.required){
                if(Array.isArray(value)) return value.length > 0;
                return value && String(value).length > 0;
            }
            return true;
        });
    },[draft, row.fields]);

    const handleFieldChange = (fieldName: string, value: any) => {
        setDraft(prev => ({ ...prev, [fieldName]: value }));
    }

    const handleSave = () => {
        const newRows = [...(Array.isArray(row.value) ? row.value : []), draft];
        onChange(row.id, newRows);
        setDraft({});
    }

    const handleDelete = (index: number) => {
        const newRows = (Array.isArray(row.value) ? row.value : []).filter((_,i) => i != index);
        onChange(row.id, newRows);
    }

    const handleSendFeedback = () => {
        if (!feedbackText.trim() || !onFeedbackSave) return;
        onFeedbackSave(feedbackText.trim());
        setFeedbackText('');
        setFeedbackOpen(false);
    };

    const handleSendResponse = (status: 'resolved' | 'rejected') => {
        if (!onFeedbackResponse) return;
        onFeedbackResponse(status, responseText.trim());
        setResponseText('');
        setFeedbackOpen(false);
    };

    const renderSavedField = (field: FieldSchema, rowItem: RepeaterRowData, cellStyle: any) => {
        const value = rowItem[field.name];

        if(Object.keys(rowItem).includes(field.name)){
            return (
                <Box key={field.name} sx={cellStyle}>
                    {Array.isArray(value) ? value.map(v => v.label).join(',') : value.label || value}
                </Box>
            );
        } else {
            return <Box key={field.name} sx={cellStyle} />;
        }
    }

    const renderField = (field: FieldSchema, cellStyle: any) => {
        switch(field.type){
            case "number":
                return (
                    <Box key={field.name} sx={cellStyle}>
                        <TextField
                            fullWidth autoFocus size="small"
                            disabled={!isEditing} type={field.type}
                            value={draft[field.name] ?? ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                    </Box>
                )
            case "text":
                return (
                    <Box key={field.name} sx={cellStyle}>
                        <TextField
                            fullWidth autoFocus size="small"
                            disabled={!isEditing} type={field.type}
                            value={draft[field.name] ?? ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                    </Box>
                )
            case "single-select":
                return (
                    <Box key={field.name} sx={cellStyle}>
                        <Autocomplete
                            fullWidth options={field.options || []}
                            value={draft[field.name] || null}
                            disabled={!isEditing}
                            onChange={(_, newValue) => handleFieldChange(field.name, newValue)}
                            getOptionLabel={(option) => option.label}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            renderInput={(params) => <TextField {...params} size="small" placeholder="Select..." />}
                        />
                    </Box>
                )
            default:
                return (
                    <Box key={field.name} sx={cellStyle}>
                        <Autocomplete
                            multiple fullWidth disableCloseOnSelect
                            options={field.options || []}
                            value={draft[field.name] || []}
                            disabled={!isEditing}
                            onChange={(_, newValue) => handleFieldChange(field.name, newValue)}
                            getOptionLabel={(option) => option.label}
                            isOptionEqualToValue={(option, value) => option.value === value.value}
                            renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                                    {option.label}
                                </li>
                            )}
                            renderInput={(params) => <TextField {...params} size="small" placeholder="Select..." />}
                        />
                    </Box>
                );
        }
    }

    const renderMiniTable = (fields: FieldSchema[]) => {
        const gridTemplate = `${fields.map(() => "1fr").join(" ")} auto`;
        const cellStyle = {
            padding: "8px 12px",
            borderRight: "1px solid",
            borderRightColor: "divider",
            display: "flex",
            alignItems: "center",
            minHeight: 40
        };

        return (isEditing || repeaterRows.length > 0) ? (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", overflow: "hidden" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: gridTemplate, backgroundColor: "background.default", borderBottom: "1px solid", borderBottomColor: "divider" }}>
                    {fields.map((subField) => (
                        <Box key={subField.name} sx={cellStyle}>{subField.label}</Box>
                    ))}
                    <Box sx={{ textAlign: "center", width: 120, padding: "8px 12px", minHeight: 40 }}>Actions</Box>
                </Box>
                {repeaterRows.map((rowItem, rowIndex) => (
                    <Box key={rowIndex} sx={{ display: "grid", gridTemplateColumns: gridTemplate, borderBottom: "1px solid", borderBottomColor: "divider", '&:hover': { backgroundColor: "action.hover" }, '& > div:last-child': { borderRight: 'none' } }}>
                        {row.fields.map((subField) => renderSavedField(subField, rowItem, cellStyle))}
                        <Box sx={{...cellStyle, justifyContent: "center", width: 120}}>
                            <IconButton color="error" disabled={!isEditing} onClick={() => handleDelete(rowIndex)}>
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    </Box>
                ))}
                {isEditing && (
                    <Box sx={{ display: "grid", gridTemplateColumns: gridTemplate }}>
                        {fields.map((subField) => renderField(subField, cellStyle))}
                        <Box sx={{...cellStyle, justifyContent: "center", width: 120}}>
                            <IconButton color="primary" disabled={!isDraftValid} onClick={handleSave}>
                                <SaveIcon />
                            </IconButton>
                        </Box>
                    </Box>
                )}
            </Box>
        ) : (
            <div style={{ cursor: "pointer" }}>
                {(Array.isArray(row.value) ? row.value : []).map((option) => option.label).join(', ') || "-"}
            </div>
        )
    };

    return (
        <>
            <TableRow
                sx={{
                    "&:hover": { backgroundColor: "action.hover" },
                    "&:last-child td": { border: 0 },
                }}
            >
                <TableCell
                    width={200}
                    sx={{ fontWeight: 600 }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: 'wrap' }}>
                        <span>{row.label}</span>
                        {showIcon && (
                            <Tooltip title={threadStatus === 'pending' ? 'Has pending feedback' : threadStatus === 'resolved' ? 'Resolved' : threadStatus === 'rejected' ? 'Rejected' : 'Add feedback'}>
                                <IconButton
                                    size="small"
                                    onClick={() => { setFeedbackText(''); setResponseText(''); setFeedbackOpen(true); }}
                                    sx={{ color: statusColor(threadStatus) }}
                                >
                                    <ChatBubbleOutlineIcon fontSize="inherit" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {threadStatus !== 'none' && (
                            <StatusChip
                                label={formatStatus(threadStatus)}
                                tone={getStatusTone(threadStatus, FEEDBACK_STATUS_TONE)}
                                tooltip={threadStatus === 'rejected' ? rejectionTooltip(safeThread) : undefined}
                                onClick={() => { setFeedbackText(''); setResponseText(''); setFeedbackOpen(true); }}
                            />
                        )}
                    </Box>
                </TableCell>
                <TableCell>
                    { renderMiniTable(row.fields) }
                </TableCell>
            </TableRow>

            <Dialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Feedback: {row.label}</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    {safeThread.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            {safeThread.map((entry, i) => (
                                <ThreadBubble key={i} entry={entry} />
                            ))}
                            <Divider sx={{ my: 1 }} />
                        </Box>
                    )}

                    {onFeedbackSave && (
                        <TextField
                            multiline rows={3} fullWidth size="small"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Write feedback for Researcher..."
                        />
                    )}

                    {canRespond && (
                        <TextField
                            multiline rows={3} fullWidth size="small"
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Optional: add a note with your response..."
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFeedbackOpen(false)}>Close</Button>

                    {onFeedbackSave && (
                        <Button variant="contained" disabled={!feedbackText.trim()} onClick={handleSendFeedback}>
                            Send Feedback
                        </Button>
                    )}

                    {canRespond && (
                        <>
                            <Button color="error" variant="outlined" onClick={() => handleSendResponse('rejected')}>
                                Reject
                            </Button>
                            <Button color="success" variant="contained" onClick={() => handleSendResponse('resolved')}>
                                Mark Resolved
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </>
    )
});

export default RepeaterRow;
