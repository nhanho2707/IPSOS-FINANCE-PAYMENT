const host = "http://localhost:8000"

export const ApiConfig = {
  project: {
    viewProjects: `${host}/api/project-management/projects`,
    viewProject: `${host}/api/project-management/projects?platform=ifield&created_user_id=`,
    updateStatusOfProject: `${host}/api/project-management/projects/{projectId}/status`,
    updateDisabledProject: `${host}/api/project-management/projects/{projectId}/disabled`,
    updateProjectInfo: `${host}/api/project-management/projects/{projectId}/update-info`,
    addProject: `${host}/api/project-management/projects/store`,
    assignUsers: `${host}/api/project-management/projects/{projectId}/assign-users`,
    getProjectTypes: `${host}/api/project-management/project-types`,
    getDepartments: `${host}/api/project-management/departments`,
    getTeams: `${host}/api/project-management/{department_id}/teams`,
    viewTransactions: `${host}/api/project-management/projects/{projectId}/transactions/show`,
    viewEmployees: `${host}/api/project-management/{projectId}/employees`,
    addEmployees: `${host}/api/project-management/projects/{projectId}/employees/store`,
    removeEmployee: `${host}/api/project-management/projects/{projectId}/employees/{employeeId}/destroy`,
    viewOfflineProjectRespondents: `${host}/api/project-management/projects/{projectId}/offline/respondents/show`,
    addOfflineProjectRespondents: `${host}/api/project-management/projects/{projectId}/offline/respondents/store`,
    removeProjectRespondent: `${host}/api/project-management/projects/{projectId}/offline/respondents/{projectRespondentId}/destroy`,
    offlineTransactionSending: `${host}/api/project-management/projects/{projectId}/offline/respondents/{projectRespondentId}/transaction`,
    verifyTransactionToken: `${host}/api/project-management/project/verify_token`,
    
    getMetadata: `${host}/api/project-management/metadata`,

    //Quotation API
    getQuotationSchema: `${host}/api/project-management/projects/{projectId}/quotation-template`,
    viewQuotation: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/view`,
    viewQuotationVersions: `${host}/api/project-management/projects/{projectId}/quotation/versions`,
    addQuotation: `${host}/api/project-management/projects/{projectId}/quotation`,
    updateQuotation: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/update`,
    destroyQuotationVersion: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/destroy`,
    cloneQuotationVersion: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/clone`,
    submitQuotationVersion: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/submit`,
    confirmFmQuotationVersion: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/confirm-fm`,
    approveQuotationVersion: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/approve`,
    withdrawQuotationVersion: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/withdraw`,
    saveQuotationFeedback: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/feedback`,
    saveQuotationFeedbackResponse: `${host}/api/project-management/projects/{projectId}/quotation/{versionId}/feedback-response`,

    //Operations
    getOperationsSchema: `${host}/api/project-management/projects/{projectId}/operations-template`,
    getOperations: `${host}/api/project-management/projects/{projectId}/versions/{versionId}/operations`,
    addOperations: `${host}/api/project-management/projects/{projectId}/versions/{versionId}/operations/store`,

    //Province Prices
    getProjectPrices: `${host}/api/project-management/projects/{projectId}/provinces/prices`,
    upsertProjectPrice: `${host}/api/project-management/projects/{projectId}/provinces/prices`,
    deleteProjectPrice: `${host}/api/project-management/projects/{projectId}/provinces/prices`,
  },
  administrative: {
    getProvinces: `${host}/api/administrative-divisions/old/provinces`,
  },
  respondent: {
    viewRespondents: `${host}/api/project-management/projects/{projectId}/respondents/show`,
  },
  employee: {
    viewEmployees: `${host}/api/project-management/projects/{projectId}/employees/show`
  },
  vinnet: {
    viewMerchantInfo: `${host}/api/transaction-management/vinnet/merchant/view`,
    viewMerchantAccount: `${host}/api/transaction-management/vinnet/merchantinfo`,
    changeMerchantKey: `${host}/api/transaction-management/vinnet/change-key`,

    performTransaction: `${host}/api/project-management/vinnet/transaction`,
    rejectTransaction: `${host}/api/project-management/vinnet/reject-transaction`,
    verifiedVinnetToken: `${host}/api/project-management/project/verify-vinnet-token`,
    storeVinnetToken: `${host}/api/project-management/project/store-vinnet-token`,
  },
  gotit: {
    viewGotItAccount: `${host}/api/transaction-management/gotit/account/{accountType}/view`,
    depositedAccount: `${host}/api/transaction-management/gotit/account/store`,

    performTransaction: `${host}/api/project-management/gotit/transaction`,
    rejectTransaction: `${host}/api/project-management/gotit/reject-transaction`,
    checkTransaction: `${host}/api/project-management/gotit/check-transaction-refid`
  },

  functions: {
    exportTransactions: `${host}/api/transaction-management/export`,
    exportTransactionsByProjecs: `${host}/api/transaction-management/projects/export`
  },
  techcombank_panel: {
    viewTechcombankPanel: `${host}/api/techcombank-panel/users`,
    viewTechcombankSurveys: `${host}/api/techcombank-panel/surveys`,
    getTotalMembers: `${host}/api/techcombank-panel/total-members`,
    getProvince: `${host}/api/techcombank-panel/provinces`,
    getAgeGroup: `${host}/api/techcombank-panel/age-group`,
    getOccupation: `${host}/api/techcombank-panel/occupation`,
    getProducts: `${host}/api/techcombank-panel/products`,
    getVennProducts: `${host}/api/techcombank-panel/venn-products`,
    getChannels: `${host}/api/techcombank-panel/channels`,
    getCount: `${host}/api/techcombank-panel/{table_name}/{column_name}`,
    getPanellist: `${host}/api/techcombank-panel/panellist`,
  },
  account: {
    login: `${host}/api/login`,
    forgotPassword: `${host}/api/forgot-password`,
    resetPassword: `${host}/api/reset-password`,
    setFirstPassword: `${host}/api/set-first-password`,
    viewAccounts: `${host}/api/users/show`,
    storeAccount: `${host}/api/users`,
    updateAccount: `${host}/api/users/{userId}`,
    viewNotifications: `${host}/api/notifications`,
    countUnRead: `${host}/api/notifications/unread-count`
  },
  minicati: {
    showBatches: `${host}/api/project-management/projects/{projectId}/mini-cati/batches/show`,
    importBatch: `${host}/api/project-management/projects/{projectId}/mini-cati/batch/import`,
    destroyBatch: `${host}/api/project-management/projects/{projectId}/mini-cati/batch/{batchId}/destroy`,
    updateBatchStatus: `${host}/api/project-management/projects/{projectId}/mini-cati/batch/{batchId}/update-status`,
    showCATIProjects: `${host}/api/cati-projects/show`,
    validateEmployee: `${host}/api/cati-project/login`,
    getSuspendedList: `${host}/api/suspended`,
    claimSuspended: `${host}/api/suspended/{id}/claim`,
    filters: `${host}/api/filters`,
    next: `${host}/api/next`,
    updateStatus: `${host}/api/update-status`,
  },
  customvoucher: {
    authenticateToke: `${host}/api/custom-voucher/authenticate-token`, 
    assignVoucher: `${host}/api/custom-voucher/assign`,
    searchLink: `${host}/api/custom-voucher/search-link`
  },
  tradeUnion: {
    viewRecipientLists: `${host}/api/trade-union/recipient-lists`,
    importRecipients: `${host}/api/trade-union/recipient-lists/import`,
    sendEmail: `${host}/api/trade-union/recipient-lists/{id}/send-email`
  },
  silverBulletDashboard: {
    getRespondents: `${host}/api/silver-bullet/respondents`,
    getMetadata: `${host}/api/silver-bullet/metadata`
  },
  codeframe: {
    import: `${host}/api/codeframe/import`,
  },
};
