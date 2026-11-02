import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../../config/ApiConfig";
import QuotationDynamicForm from "./QuotationDynamicForm";
import { useQuotation } from "../../../hook/useQuotation";
import { useParams, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, IconButton, MenuItem, Tab, Tabs, TextField } from "@mui/material";
import TabPanel from "../../../components/TabPanel";
import { QuotationVersionData } from "../../../config/QuotationConfig";
import CloseIcon from "@mui/icons-material/Close";
import useDialog from "../../../hook/useDialog";
import ConfirmDialog from "../../../components/Dialogs/ConfirmDialog";
import GenericDialog from "../../../components/Dialogs/GenericDialog";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import QuotationVersionHeader from "./QuotationVersionHeader";
import { hasRole, ROLE_ACCESS } from "../../../config/RoleConfig";
import OperationsDynamicForm from "./OperationsDynamicForm";
import { useOperations } from "../../../hook/useOperations";
import EstimateCostTable, { EstimateCostNode, normalizeNodes } from "./EstimateCostTable";
import { createDefaultEstimateCost } from "./EstimateCostTemplate";
import CalculateIcon from '@mui/icons-material/Calculate';
import { formatStatus } from "../../../utils/format";
import StatusChip from "../../../components/StatusChip";
import { getStatusTone, QUOTATION_STATUS_TONE } from "../../../config/ThemeConfig";

const Quotation: React.FC = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;
    const [searchParams] = useSearchParams();

    const { user } = useAuth();
    const { showToast } = useToast();
    const canMutate = hasRole(user?.role, ROLE_ACCESS.quotationMutate);
    const canApprove = hasRole(user?.role, ROLE_ACCESS.quotationApprove);

    const [ formKey, setFormKey ] = useState(0);
    const [ quotationSchema, setQuotationSchema ] = useState([]);
    const [ operationSchema, setOperationSchema ] = useState([]);

    const { actionState,
            project,
            versions,
            selectedVersion,
            setSelectedVersion,
            canEdit,
            setCanEdit,
            getQuotationVersions,
            addQuotation,
            updateQuotationVersion,
            destroyQuotationVersion,
            submitQuotationVersion,
            cloneQuotationVersion,
            confirmFmVersion,
            approveQuotationVersion,
            withdrawQuotationVersion,
            saveFeedback,
            saveFeedbackResponse
    } = useQuotation(Number(id));

    const { selectedOperations, 
            actionState: operationsActionState, 
            addOperations, 
            getOperations 
    } = useOperations(projectId);

    const [ openAlert, setOpenAlert ] = useState(false);
    const [ alertSource, setAlertSource ] = useState<'quotation' | 'operations'>('quotation');
    const [ isEditing, setIsEditing ] = useState(false);

    const [ estimateCostItems, setEstimateCostItems ] = useState<EstimateCostNode[]>([]);
    const [ showEstimatedCost, setShowEstimatedCost ] = useState(false);

    const { openDialog, dialogProps } = useDialog();
    
    const [ openCloneNewVersion, setOpenCloneNewVersion ] = useState<boolean>(false);
    const [ selectedCloneVersion, setSelectedCloneVersion ] = useState<QuotationVersionData | null>(null);

    const loadQuotationSchema = useCallback(async (projectType?: string) => {
        try {
            const token = localStorage.getItem('authToken');
            let url = ApiConfig.project.getQuotationSchema.replace("{projectId}", projectId.toString());
            if (projectType) url += `?project_type=${encodeURIComponent(projectType)}`;
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            setQuotationSchema(response.data);
        } catch (error: any) {
            console.error(error.response?.data || error.message);
        }
    }, [projectId]);

    const loadOperationSchema = useCallback(async (projectType?: string) => {
        try {
            const token = localStorage.getItem('authToken');
            let url = ApiConfig.project.getOperationsSchema.replace("{projectId}", projectId.toString());
            
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            setOperationSchema(response.data);
        } catch (error: any) {
            console.error(error.response?.data || error.message);
        }
    }, [projectId]);

    useEffect(() => {
        if (versions.length === 0) loadQuotationSchema();
    }, [loadQuotationSchema]);

    // Reload schema with the selected version's own project_type when switching versions
    useEffect(() => {
        if (!selectedVersion) return;
        const projectTypes = selectedVersion.quotation_data?.project_types;
        let type: string | undefined;
        if (Array.isArray(projectTypes) && projectTypes.length > 0) {
            const first = projectTypes[0];
            type = typeof first === 'object' ? (first as any)?.label : first;
        } else if (typeof projectTypes === 'string') {
            type = projectTypes;
        }
        loadQuotationSchema(type);
    }, [selectedVersion?.id]);

    useEffect(() => {
        loadOperationSchema();
    }, [loadOperationSchema]);

    const versionParamApplied = useRef(false);

    // Auto-select version from ?version= query param — only on initial load
    useEffect(() => {
        if (versionParamApplied.current || !versions || versions.length === 0) return;
        const versionId = Number(searchParams.get('version'));
        if (versionId) {
            const target = versions.find(v => v.id === versionId);
            if (target) setSelectedVersion(target);
        } else if (!canMutate) {
            // Field Manager: prefer the first submitted version
            const submitted = versions.find(v => v.status === 'submitted');
            if (submitted) setSelectedVersion(submitted);
        }
        versionParamApplied.current = true;
    }, [versions, searchParams]);

    // Load operations data whenever the selected version changes
    useEffect(() => {
        if (!selectedVersion) return;
        getOperations(selectedVersion.id);
    }, [selectedVersion?.id]);

    // Sync estimateCostItems from loaded operations; reset tab if no data for new version
    useEffect(() => {
        const items = selectedOperations?.operations_data?.estimate_cost;
        if (Array.isArray(items) && items.length > 0) {
            setEstimateCostItems(normalizeNodes(items));
            setShowEstimatedCost(true);
        } else {
            setEstimateCostItems([]);
            setShowEstimatedCost(false);
            setValue(prev => prev === 'three' ? 'two' : prev);
        }
    }, [selectedOperations?.id]);

    const handleCopyLink = () => {
        if (!selectedVersion) return;
        const url = `${window.location.origin}${window.location.pathname}?version=${selectedVersion.id}`;
        navigator.clipboard.writeText(url)
            .then(() => showToast(`Link to version ${selectedVersion.version} copied.`))
            .catch(() => showToast("Could not copy the link. Copy it from the address bar instead.", "error"));
    };

    // FM confirmation waits until the researcher has answered every open feedback thread.
    const hasPendingFeedback = Object.values(selectedVersion?.feedbacks ?? {}).some(thread =>
        Array.isArray(thread) && thread.length > 0 && thread[thread.length - 1].type === 'feedback'
    );

    const handleSaveOperations = async (data: any) => {
        try{
            if(!selectedVersion) return;
            await addOperations(selectedVersion.id, { ...data, estimate_cost: estimateCostItems });
            setAlertSource('operations');
            setOpenAlert(true);
        } catch(error: any){
            setAlertSource('operations');
            setOpenAlert(true);
        }
    }

    const handleSaveEstimateCost = async () => {
        try {
            if (!selectedVersion) return;
            const merged = {
                ...(selectedOperations?.operations_data ?? {}),
                estimate_cost: estimateCostItems
            };
            await addOperations(selectedVersion.id, merged);
            setAlertSource('operations');
            setOpenAlert(true);
        } catch (error: any) {
            setAlertSource('operations');
            setOpenAlert(true);
        }
    };


    const handleSaveVersion = async (data:any) => {
        try
        {
            let quotation = null;
            const currentVersionId = selectedVersion?.id;

            if(isEditing){
                quotation = await updateQuotationVersion(data);
            } else {
                quotation = await addQuotation(data);
            }

            await getQuotationVersions({ silent: true, keepSelectedId: currentVersionId });

            setIsEditing(false);
            setCanEdit(true);
            setAlertSource('quotation');
            setOpenAlert(true);

            setFormKey(formKey + 1);
        } catch(error: any){
            setAlertSource('quotation');
            setOpenAlert(true);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormKey(formKey + 1);
        const projectTypes = selectedVersion?.quotation_data?.project_types;
        let type: string | undefined;
        if (Array.isArray(projectTypes) && projectTypes.length > 0) {
            const first = projectTypes[0];
            type = typeof first === 'object' ? (first as any)?.label : first;
        } else if (typeof projectTypes === 'string') {
            type = projectTypes;
        }
        loadQuotationSchema(type);
    }

    const handleRemove = () => {
        openDialog({
            title: "Delete Version",
            tone: "danger",
            confirmText: "Delete",
            message: `Are you sure that you want to remove this version "${selectedVersion?.version}"?`,
            showConfirmButton: true,
            onConfirm: async () => {
                await destroyQuotationVersion();

                setFormKey(formKey + 1);

                setIsEditing(false);
                setCanEdit(true);
                setAlertSource('quotation');
                setOpenAlert(true);
            }
        });
    }

    const handleSubmit = () => {

        openDialog({
            title: 'Submit Version',
            confirmText: 'Submit',
            message: `Are you sure that you want to submit this version?`,
            showConfirmButton: true,
            onConfirm: async () => {
                await submitQuotationVersion();

                setFormKey(formKey + 1);

                setIsEditing(false);
                setCanEdit(true);
                setAlertSource('quotation');
                setOpenAlert(true);
            }
        });
    };

    const handleApprove = () => {
        openDialog({
            title: 'Approve Version',
            confirmText: 'Approve',
            message: `Are you sure that you want to approve this version?`,
            showConfirmButton: true,
            onConfirm: async () => {
                await approveQuotationVersion();
                setAlertSource('quotation');
                setOpenAlert(true);
            }
        });
    }

    const handleWithdraw = () => {
        openDialog({
            title: 'Withdraw Version',
            confirmText: 'Withdraw',
            message: `Are you sure that you want to withdraw this version? It will return to draft and can be edited again.`,
            showConfirmButton: true,
            onConfirm: async () => {
                await withdrawQuotationVersion();
                setAlertSource('quotation');
                setOpenAlert(true);
            }
        });
    }

    const handleConfirmFm = () => {
        openDialog({
            title: 'Confirm FM review',
            confirmText: 'Confirm',
            message: `Confirm that you have finished reviewing this quotation?\n\nAfter confirming:\n• FM can no longer add feedback\n• Researcher can approve the quotation`,
            showConfirmButton: true,
            onConfirm: async () => {
                await confirmFmVersion();
                setAlertSource('quotation');
                setOpenAlert(true);
            }
        });
    };

    const handleOpenCloneNewVersionDialog = () => {
        setOpenCloneNewVersion(true);
    }

    const handleCloneNewVersion = async () => {
        if(!selectedCloneVersion) return;

        await cloneQuotationVersion(selectedCloneVersion);

        setFormKey(formKey + 1);

        setOpenCloneNewVersion(false);
        setSelectedCloneVersion(null);

        setIsEditing(true);
        setCanEdit(true);
        setAlertSource('quotation');
        setOpenAlert(true);
    }

    //Tab
    const [value, setValue] = useState('one');
    
    const handleChange = (event: React.SyntheticEvent, newValue: string) => {
        setValue(newValue);
    };

    return (
        <>
            {selectedVersion && (
                <Box sx={{ mb: 2.5 }}>
                    {openAlert && (
                        <Alert
                            severity={(alertSource === 'operations' ? operationsActionState : actionState).error ? "error" : "success"}
                            sx={{ mb: 1.5 }}
                            action={
                                <IconButton
                                    aria-label="close"
                                    color="inherit"
                                    size="small"
                                    onClick={() => setOpenAlert(false)}
                                >
                                    <CloseIcon fontSize="inherit" />
                                </IconButton>
                            }
                        >
                            {(alertSource === 'operations' ? operationsActionState : actionState).message}
                        </Alert>
                    )}
                    <QuotationVersionHeader
                        versions={versions ?? []}
                        selectedVersion={selectedVersion}
                        onSelectVersion={(version) => {
                            setSelectedVersion(version);
                            setOpenAlert(false);
                        }}
                        isEditing={isEditing}
                        canMutate={canMutate}
                        canEdit={canEdit}
                        canApprove={canApprove}
                        hasPendingFeedback={hasPendingFeedback}
                        onEdit={() => {
                            setOpenAlert(false);
                            setIsEditing(true);
                        }}
                        onCancelEdit={handleCancel}
                        onDelete={handleRemove}
                        onSubmit={handleSubmit}
                        onWithdraw={handleWithdraw}
                        onApprove={handleApprove}
                        onConfirmFm={handleConfirmFm}
                        onNewVersion={handleOpenCloneNewVersionDialog}
                        onCopyLink={handleCopyLink}
                    />
                </Box>
            )}

            <Tabs
                value={value}
                onChange={handleChange}
                aria-label="quotation tabs"
                sx={{ borderBottom: 1, borderColor: "divider" }}
            >
                <Tab value="one" label="General" />
                <Tab value="two" label="Operations" />
                {showEstimatedCost && <Tab value="three" label="Estimated cost" />}
            </Tabs>

            <TabPanel value={value} index="one">
                <QuotationDynamicForm
                    key={`${selectedVersion?.id}-${formKey}`}
                    schema={quotationSchema}
                    initialData={selectedVersion?.quotation_data}
                    isEditting={versions?.length === 0 ? true : isEditing}
                    onSubmit={handleSaveVersion}
                    onProjectTypeChange={loadQuotationSchema}
                    feedbacks={selectedVersion?.feedbacks}
                    onFeedbackSave={!canMutate && selectedVersion?.status === 'submitted' ? (section, content) => saveFeedback(section, content) : undefined}
                    onFeedbackResponse={canMutate && selectedVersion?.status === 'submitted' ? (section, status, content) => saveFeedbackResponse(section, status, content) : undefined}
                />
            </TabPanel>
            <TabPanel value={value} index="two">
                <OperationsDynamicForm
                    key={`${selectedVersion?.id}-${formKey}`}
                    schema={operationSchema}
                    initialData={selectedOperations?.operations_data}
                    isEditting={!canMutate}
                    onSubmit={handleSaveOperations}
                />
                {!canMutate && !showEstimatedCost && (
                    <Button
                        variant="outlined"
                        startIcon={<CalculateIcon />}
                        onClick={() => {
                            if (estimateCostItems.length === 0) {
                                setEstimateCostItems(createDefaultEstimateCost());
                            }
                            setShowEstimatedCost(true);
                            setValue('three');
                        }}
                        sx={{ mt: 1 }}
                    >
                        Generate Estimated Cost
                    </Button>
                )}
            </TabPanel>

            <TabPanel value={value} index="three">
                <EstimateCostTable
                    value={estimateCostItems}
                    isEditing={!canMutate}
                    onChange={setEstimateCostItems}
                />
                {!canMutate && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveEstimateCost}
                        >
                            Save
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => openDialog({
                                title: 'Load Template',
                                message: 'Reset to the default template? Current data will be lost.',
                                showConfirmButton: true,
                                tone: 'danger',
                                confirmText: 'Reset',
                                onConfirm: () => setEstimateCostItems(createDefaultEstimateCost()),
                            })}
                        >
                            Load Template
                        </Button>
                    </Box>
                )}
            </TabPanel>

            <ConfirmDialog {...dialogProps} />

            <GenericDialog
                open={openCloneNewVersion}
                title="Create a New Version" 
                children={
                    <TextField
                        select
                        fullWidth
                        variant="outlined"
                        value={selectedCloneVersion?.id ?? ""}
                        onChange={(e) => {
                            const version = versions?.find(v => v.id === Number(e.target.value));
                            setSelectedCloneVersion(version || null);
                        }}
                    >
                        {versions?.map((v: QuotationVersionData) => {
                            return (
                                <MenuItem
                                    key={v.id} 
                                    value={v.id}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            width: "100%"
                                        }}
                                    >
                                        <span>Version {v.version}</span>
                                        
                                        <StatusChip label={formatStatus(v.status)} tone={getStatusTone(v.status, QUOTATION_STATUS_TONE)} />
                                    </Box>
                                </MenuItem>
                            )
                        })}
                    </TextField>
                } 
                onClose={() => setOpenCloneNewVersion(false)} 
                onSubmit={handleCloneNewVersion} 
                submitText = "Submit"
                cancelText = "Cancel"
            />
        </>
    )
}

export default Quotation;