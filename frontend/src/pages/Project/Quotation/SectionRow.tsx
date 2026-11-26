import { memo, useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import RadioRow from "./RadioRow";
import RangeRow from "./RangeRow";
import MultiSelectRow from "./MultiSelectRow";
import SingleSelectRow from "./SingleSelectRow";
import RichTextRow from "./RichTextRow";
import EditableRow from "./EditableRow";
import { FieldSchema } from "../../../utils/renderFields";
import { FeedbackThread, FeedbackThreadEntry } from "../../../config/QuotationConfig";
import { formatDateTime, formatStatus } from "../../../utils/format";
import StatusChip from "../../../components/StatusChip";
import { FEEDBACK_STATUS_TONE, getStatusTone } from "../../../config/ThemeConfig";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n/i18n";

export interface SectionRowData {
    [key: string]: any
}

type Props = {
    row: {
        id: string,
        label: string,
        value: SectionRowData,
        fields: FieldSchema[],
        placeholder?: string
    };
    isEditing: boolean,
    onChange: (id: string, value: SectionRowData) => void;
    feedbackThread?: FeedbackThread;
    onFeedbackSave?: (content: string) => void | Promise<any>;
    onFeedbackResponse?: (status: 'resolved' | 'rejected', content: string) => void | Promise<any>;
}

// Field-specific overrides that don't belong in the generic backend schema
// A function, so the confirmation text is read in the current language.
const fieldOverrides = (): Record<string, Partial<FieldSchema>> => ({
    internal_code: { disabled: true, rule: 'maskXXXX_XXXX' },
    project_name:  { rule: 'uppercaseNoSpecial' },
    project_types: { confirmMessage: i18n.t("quotation.form.projectTypeChange") },
});


function getThreadStatus(thread?: FeedbackThread): 'none' | 'pending' | 'resolved' | 'rejected' {
    if (!thread || !Array.isArray(thread) || thread.length === 0) return 'none';
    const last = thread[thread.length - 1];
    if (last.type === 'feedback') return 'pending';
    return last.status ?? 'none';
}

function rejectionTooltip(thread: FeedbackThread): string {
    const lastRejection = [...thread].reverse().find(e => e.type === 'response' && e.status === 'rejected');
    return lastRejection?.content ? i18n.t("quotation.feedback.reason", { reason: lastRejection.content }) : i18n.t("quotation.feedback.rejected");
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
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.25, px: 0.5 }}>
                {entry.user_name} · {formatDateTime(entry.created_at)}
            </Typography>
        </Box>
    );
}

const SectionRow = memo(({row, isEditing, onChange, feedbackThread, onFeedbackSave, onFeedbackResponse}: Props) => {
    const { t } = useTranslation();
    const [ draft, setDraft ] = useState<SectionRowData>(row.value || {});
    const [ feedbackOpen, setFeedbackOpen ] = useState(false);
    const [ feedbackText, setFeedbackText ] = useState('');
    const [ responseText, setResponseText ] = useState('');

    const safeThread = Array.isArray(feedbackThread) ? feedbackThread : [];
    const threadStatus = getThreadStatus(safeThread);
    const showIcon = onFeedbackSave || onFeedbackResponse || safeThread.length > 0;
    const lastEntry = safeThread.length ? safeThread[safeThread.length - 1] : null;
    const canRespond = onFeedbackResponse && lastEntry?.type === 'feedback';

    const handleFieldChange = (fieldName: string, value: any) => {
        let newDraft = {
            ...draft,
            [fieldName]: value
        };

        if (fieldName === 'industry') {
            newDraft = { ...newDraft, category: undefined, subcategory: undefined };
        } else if (fieldName === 'category') {
            newDraft = { ...newDraft, subcategory: undefined };
        }

        setDraft(newDraft);
        onChange(row.id, newDraft);
    }

    useEffect(() => {
        setDraft(row.value || {});
    }, [row.value]);

    const [ editingId, setEditingId ] = useState<string | null>(null);

    const renderField = (fieldSchema: FieldSchema) => {
        let disabled = false;
        let options = fieldSchema.options ?? [];
        const field: FieldSchema = { ...fieldSchema, ...fieldOverrides()[fieldSchema.name] };

        switch (field.type) {
            case 'text':
            case 'number':
                return (
                    <EditableRow
                        key={field.name}
                        row={{ 
                            id: field.name, 
                            label: field.label, 
                            type: field.type as 'text' | 'number', 
                            placeholder: field.placeholder,
                            value: draft[field.name], 
                            ...(field.rule ? { rule: field.rule as any } : {}) 
                        }}
                        isEditing={isEditing}
                        isActive={editingId === field.name}
                        onStartEdit={() => setEditingId(field.name)}
                        onStopEdit={() => setEditingId(field.name)}
                        onChange={handleFieldChange}
                    />
                )
            case 'textarea':
                return (
                    <RichTextRow
                        key={field.name}
                        row={{
                            id: field.name, 
                            label: field.label, 
                            value: draft[field.name], 
                            placeholder: field.placeholder
                        }}
                        isEditing={isEditing}
                        isActive={editingId === field.name}
                        onStartEdit={() => setEditingId(field.name)}
                        onStopEdit={() => setEditingId(field.name)}
                        onChange={handleFieldChange}
                    />
                )
            case 'radio':
                return (
                    <RadioRow
                        key={field.name}
                        row={{id: field.name, label: field.label, value: draft[field.name], options: field.options ?? []}}
                        isEditing={isEditing}
                        onChange={handleFieldChange}
                    />
                )
            case 'range':
                return (
                    <RangeRow
                        key={field.name}
                        row={{id: field.name, label: field.label, value: draft[field.name]}}
                        isEditing={isEditing}
                        onChange={handleFieldChange}
                    />
                )
            case 'multi-select':
                if(field.name === 'category'){
                    disabled = !isEditing || !draft['industry'];
                    const rawIndustry = Array.isArray(draft['industry']) ? draft['industry'][0] : draft['industry'];
                    const industryOption = typeof rawIndustry === 'object' && rawIndustry !== null
                        ? rawIndustry
                        : row.fields.find(f => f.name === 'industry')?.options?.find(o => o.label === rawIndustry);
                    if (industryOption) options = options.filter(o => String(o.parent) === String(industryOption.value));
                }
                if(field.name === 'subcategory'){
                    disabled = !isEditing || !draft['industry'] || !draft['category'];
                    const rawCategory = Array.isArray(draft['category']) ? draft['category'][0] : draft['category'];
                    const categoryOption = typeof rawCategory === 'object' && rawCategory !== null
                        ? rawCategory
                        : row.fields.find(f => f.name === 'category')?.options?.find(o => o.label === rawCategory);
                    if (categoryOption) options = options.filter(o => String(o.parent) === String(categoryOption.value));
                }

                return (
                    <MultiSelectRow
                        key={field.name}
                        row={{
                            id: field.name, 
                            label: field.label, 
                            value: draft[field.name], 
                            options,
                            placeholder: field.placeholder 
                        }}
                        isEditing={isEditing}
                        isDisabled={disabled}
                        onChange={handleFieldChange}
                    />
                )
            case 'single-select':
                if(field.name === 'project_types'){
                    options = options.filter(o => ['CLT','F2F','HUT','CATI'].includes(o.label));
                }
                if(field.name === 'category'){
                    disabled = !isEditing || !draft['industry'];
                    const rawIndustry = Array.isArray(draft['industry']) ? draft['industry'][0] : draft['industry'];
                    const industryOption = typeof rawIndustry === 'object' && rawIndustry !== null
                        ? rawIndustry
                        : row.fields.find(f => f.name === 'industry')?.options?.find(o => o.label === rawIndustry);
                    if (industryOption) options = options.filter(o => String(o.parent) === String(industryOption.value));
                }
                if(field.name === 'subcategory'){
                    disabled = !isEditing || !draft['industry'] || !draft['category'];
                    const rawCategory = Array.isArray(draft['category']) ? draft['category'][0] : draft['category'];
                    const categoryOption = typeof rawCategory === 'object' && rawCategory !== null
                        ? rawCategory
                        : row.fields.find(f => f.name === 'category')?.options?.find(o => o.label === rawCategory);
                    if (categoryOption) options = options.filter(o => String(o.parent) === String(categoryOption.value));
                }

                return (
                    <SingleSelectRow
                        key={field.name}
                        row={{
                            id: field.name, 
                            label: field.label, 
                            value: draft[field.name], 
                            options,
                            placeholder: field.placeholder
                        }}
                        isEditing={isEditing}
                        isDisabled={disabled}
                        onChange={handleFieldChange}
                        confirmMessage={field.confirmMessage || undefined}
                    />
                )
        }
    }

    const renderMiniTable = (fields: FieldSchema[]) => {
        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <colgroup>
                        <col style={{ width: '250px' }} />
                        <col />
                    </colgroup>
                    <TableBody>
                        {fields
                            .filter((subField) => !subField.hidden)
                            .map((subField) => renderField(subField))}
                    </TableBody>
                </Table>
            </TableContainer>
        )
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
                            <Tooltip title={threadStatus === 'pending' ? t("quotation.feedback.pending") : threadStatus === 'resolved' ? t("quotation.feedback.resolved") : threadStatus === 'rejected' ? t("quotation.feedback.rejected") : t("quotation.feedback.add")}>
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
                <DialogTitle>{t("quotation.feedback.title", { label: row.label })}</DialogTitle>
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
                            multiline
                            rows={3}
                            fullWidth
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder={t("quotation.feedback.writePlaceholder")}
                            size="small"
                        />
                    )}

                    {canRespond && (
                        <TextField
                            multiline
                            rows={3}
                            fullWidth
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder={t("quotation.feedback.responsePlaceholder")}
                            size="small"
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFeedbackOpen(false)}>{t("quotation.feedback.close")}</Button>

                    {onFeedbackSave && (
                        <Button
                            variant="contained"
                            disabled={!feedbackText.trim()}
                            onClick={handleSendFeedback}
                        >
                            {t("quotation.feedback.send")}
                        </Button>
                    )}

                    {canRespond && (
                        <>
                            <Button color="error" variant="outlined" onClick={() => handleSendResponse('rejected')}>
                                {t("quotation.feedback.reject")}
                            </Button>
                            <Button color="success" variant="contained" onClick={() => handleSendResponse('resolved')}>
                                {t("quotation.feedback.resolve")}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </>
    )
});

export default SectionRow;
