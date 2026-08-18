<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ResetPasswordController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\VinnetController;
use App\Http\Controllers\AdministrativeDivisionsController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\MetadataController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\TechcombankPanelController;
use App\Http\Controllers\TechcombankSurveysController;
use App\Http\Controllers\GotItController;
use App\Http\Controllers\QrCodeController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\ProjectRespondentController;
use App\Http\Controllers\QuotationTemplateController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\CatiController;
use App\Http\Controllers\CustomVouchersController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\TradeUnionRecipientListController;
use App\Http\Controllers\AccountDepositController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OperationsController;
use App\Http\COntrollers\OperationsTemplateController;
use App\Http\Controllers\SilverBulletController;

// ══════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════════════════

Route::post('/login', [LoginController::class, 'login'])->name('index');
Route::post('/forgot-password', [ForgotPasswordController::class, 'resetPassword']);
Route::post('/reset-password', [ResetPasswordController::class, 'reset']);

Route::prefix('administrative-divisions')->group(function () {
    Route::get('/old/provinces', [AdministrativeDivisionsController::class, 'get_old_provinces']);
    Route::get('/old/{provinceId}/districts', [AdministrativeDivisionsController::class, 'get_old_districts']);
    Route::get('/new/provinces', [AdministrativeDivisionsController::class, 'get_provinces']);
    Route::get('/new/{provinceId}/districts', [AdministrativeDivisionsController::class, 'get_districts']);
});

Route::prefix('project-management')->group(function () {
    Route::get('/metadata', [MetadataController::class, 'index']);
    Route::get('/departments', [DepartmentController::class, 'index']);
    Route::get('/{department_id}/teams', [DepartmentController::class, 'get_teams']);
});

// ══════════════════════════════════════════════════════════
//  SANCTUM-PROTECTED ROUTES
// ══════════════════════════════════════════════════════════

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [LoginController::class, 'logout']);
    Route::post('/set-first-password', [UserController::class, 'setFirstPassword']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'countUnRead']);

    // ── Admin ──────────────────────────────────────────────
    Route::middleware('ensureUserHasRole:Admin')->group(function () {
        Route::get('/users/show', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);

        Route::prefix('trade-union/recipient-lists')->group(function () {
            Route::get('/', [TradeUnionRecipientListController::class, 'index']);
            Route::post('/import', [ImportController::class, 'importRecipients']);
            Route::post('/{id}/send-email', [TradeUnionRecipientListController::class, 'sendEmail']);
        });
    });

    // ── Project Management ────────────────────────────────
    Route::prefix('project-management')->group(function () {

        Route::get('/projects', [ProjectController::class, 'index']);
        Route::get('/projects/{projectId}/show', [ProjectController::class, 'show']);
        Route::post('/projects/store', [ProjectController::class, 'store']);
        Route::put('/projects/{projectId}/status', [ProjectController::class, 'updateStatus']);
        Route::get('/projects/{projectId}/transactions/show', [TransactionController::class, 'show']);
        
        Route::put('/projects/{projectId}/update-info', [ProjectController::class, 'updateProjectInfo'])
            ->middleware('ensureUserHasRole:Admin,Scripter');

        Route::get('/projects/{projectId}/provinces/prices', [ProjectController::class, 'getProjectPrices']);
        Route::put('/projects/{projectId}/provinces/prices', [ProjectController::class, 'upsertProjectPrice'])
            ->middleware('ensureUserHasRole:Admin,Scripter');
        Route::delete('/projects/{projectId}/provinces/prices', [ProjectController::class, 'deleteProjectPrice'])
            ->middleware('ensureUserHasRole:Admin,Scripter');

        Route::middleware('ensureUserHasRole:Admin')->group(function () {
            Route::put('/projects/{projectId}/update', [ProjectController::class, 'update']);
            Route::put('/projects/{projectId}/disabled', [ProjectController::class, 'updateDisabled']);
            Route::delete('/projects/{projectId}/provinces/{provinceId}/remove', [ProjectController::class, 'removeProvinceFromProject']);
            Route::post('/projects/{projectId}/employees/store', [ProjectController::class, 'bulkAddEmployees']);
            Route::delete('/projects/{projectId}/employees/{employeeId}/destroy', [ProjectController::class, 'bulkRemoveEmployee']);
            Route::post('/projects/{projectId}/offline/respondents/store', [ProjectRespondentController::class, 'bulkImportOfflineProjectRespondents']);
            Route::get('/projects/{projectId}/offline/respondents/show', [ProjectRespondentController::class, 'show']);
            Route::delete('/projects/{projectId}/offline/respondents/{projectRespondentId}/destroy', [ProjectRespondentController::class, 'bulkRemoveProjectRespondent']);
            Route::post('/projects/{projectId}/offline/respondents/{projectRespondentId}/transaction', [GotItController::class, 'perform_offline_transaction']);
        });

        Route::put('/projects/{projectId}/assign-users', [ProjectController::class, 'assignUsers'])
            ->middleware('ensureUserHasRole:Admin,Researcher,Scripter,Field Manager');

        Route::get('/projects/{projectId}/employees/show', [EmployeeController::class, 'index'])
            ->middleware('ensureUserHasRole:Admin,Field Manager,Finance');

        Route::middleware('ensureUserHasRole:Admin,Scripter,Field Manager')
            ->prefix('projects/{projectId}/mini-cati')->group(function () {
                Route::get('/batches/show', [CATIController::class, 'index']);
                Route::post('/batch/import', [ImportController::class, 'importCATIRespondents']);
                Route::delete('/batch/{batchId}/destroy', [CATIController::class, 'destroyBatch']);
                Route::put('/batch/{batchId}/update-status', [CATIController::class, 'updateState']);
            });

        Route::middleware('ensureUserHasRole:Admin,Researcher,Field Manager')
            ->prefix('projects/{projectId}')->group(function () {
                Route::get('/quotation-template', [QuotationTemplateController::class, 'parse']);

                Route::prefix('quotation')->group(function () {
                    Route::get('/versions', [QuotationController::class, 'getQuotationVersions']);
                    Route::post('/', [QuotationController::class, 'store']);
                    Route::post('/{versionId}/withdraw', [QuotationController::class, 'withdraw']);
                    Route::get('/{versionId}/view', [QuotationController::class, 'getQuotation']);
                    Route::put('/{versionId}/update', [QuotationController::class, 'update']);
                    Route::post('/{versionId}/clone', [QuotationController::class, 'cloneVersion']);
                    Route::put('/{versionId}/submit', [QuotationController::class, 'submit']);
                    Route::put('/{versionId}/confirm-fm', [QuotationController::class, 'confirmFm']);
                    Route::put('/{versionId}/approve', [QuotationController::class, 'approve']);
                    Route::put('/{versionId}/feedback', [QuotationController::class, 'saveFeedback']);
                    Route::put('/{versionId}/feedback-response', [QuotationController::class, 'saveFeedbackResponse']);
                    Route::delete('/{versionId}/destroy', [QuotationController::class, 'destroy']);
                });

                Route::get('/operations-template', [OperationsTemplateController::class, 'parse']);

                Route::prefix('versions')->group(function() {
                    Route::get('/{versionId}/operations', [OperationsController::class, 'getOperations']);
                    Route::post('/{versionId}/operations/store', [OperationsController::class, 'store']);
                });
            });
    });

    // ── Transaction Management ────────────────────────────
    Route::middleware('ensureUserHasRole:Admin,Finance')
        ->prefix('transaction-management')->group(function () {
            Route::get('/vinnet/merchant/view', [VinnetController::class, 'get_merchant_info']);
            Route::post('/vinnet/change-key', [VinnetController::class, 'change_key']);
            Route::get('/vinnet/merchantinfo', [VinnetController::class, 'merchantinfo']);
            Route::post('/gotit/account/store', [AccountDepositController::class, 'store']);
            Route::get('/gotit/account/{accountType}/view', [AccountDepositController::class, 'getGotItAccount']);
            Route::get('/export', [ExportController::class, 'exportTransaction']);
            Route::get('/projects/export', [ExportController::class, 'exportTransactionByProjects']);
        });
});

// ══════════════════════════════════════════════════════════
//  PAYMENT PROVIDER CALLBACKS (no auth — called by Vinnet/GotIt)
// ══════════════════════════════════════════════════════════

Route::prefix('project-management')->group(function () {
    Route::get('/project/verify_token', [TransactionController::class, 'verify']);
    Route::post('/project/authenticate_token', [TransactionController::class, 'authenticate_token']);
    Route::post('/project/refusal-transaction', [TransactionController::class, 'refusal_transaction']);
    Route::post('/vinnet/transaction', [VinnetController::class, 'perform_transaction']);
    Route::post('/vinnet/check-transaction', [VinnetController::class, 'check_transaction']);
    Route::post('/gotit/transaction', [GotItController::class, 'perform_transaction']);
    Route::post('/gotit/check-transaction', [GotItController::class, 'check_transaction']);
});

// ══════════════════════════════════════════════════════════
//  TECHCOMBANK PANEL
// ══════════════════════════════════════════════════════════

Route::prefix('techcombank-panel')->group(function () {
    Route::get('/surveys', [TechcombankSurveysController::class, 'index']);
    Route::get('/users', [TechcombankPanelController::class, 'index']);
    Route::get('/total-members', [TechcombankPanelController::class, 'getTotalMembers']);
    Route::get('/provinces', [TechcombankPanelController::class, 'getProvince']);
    Route::get('/age-group', [TechcombankPanelController::class, 'getAgeGroup']);
    Route::get('/occupation', [TechcombankPanelController::class, 'getOccupation']);
    Route::get('/channels', [TechcombankPanelController::class, 'getChannels']);
    Route::get('/products', [TechcombankPanelController::class, 'getProducts']);
    Route::get('/venn-products', [TechcombankPanelController::class, 'getVennProducts']);
    Route::get('/panellist', [TechcombankPanelController::class, 'getPanellist']);
    Route::get('/{table_name}/{column_name}', [TechcombankPanelController::class, 'getCount']); // wildcard — keep last
});

// ══════════════════════════════════════════════════════════
//  CUSTOM VOUCHER
// ══════════════════════════════════════════════════════════

Route::prefix('custom-voucher')->group(function () {
    Route::post('/authenticate-token', [CustomVouchersController::class, 'authenticateToken']);
    Route::post('/assign', [CustomVouchersController::class, 'assignVoucher']);
    Route::post('/search-link', [CustomVouchersController::class, 'searchLink']);
});

// ══════════════════════════════════════════════════════════
//  MINI CATI
// ══════════════════════════════════════════════════════════

Route::get('/cati-projects/show', [CatiController::class, 'getCATIProjects']);
Route::post('/cati-project/login', [CatiController::class, 'catiLogin']);

Route::middleware('catiAuthMiddleware')->group(function () {
    Route::post('/next', [CatiController::class, 'getCatiRespondent']);
    Route::post('/update-status', [CatiController::class, 'updateStatus']);
    Route::get('/filters', [CatiController::class, 'filters']);
    Route::get('/suspended', [CatiController::class, 'getSuspended']);
    Route::post('/suspended/{id}/claim', [CatiController::class, 'claimRespondent']);
});

Route::post('cati/authenticate-token', [CatiController::class, 'authenticateToken']);

// ══════════════════════════════════════════════════════════
//  MISC / DEBUG
// ══════════════════════════════════════════════════════════

Route::get('/generate-qr', [QrCodeController::class, 'generate']);
Route::post('/cmc-telecom/sendsms', [VinnetController::class, 'cmc_telecom_send_sms']);
Route::get('/test_sms', [VinnetController::class, 'test_sms']);

// ══════════════════════════════════════════════════════════
//  SILVER BULLET DASHBOARD
// ══════════════════════════════════════════════════════════

Route::get('/silver-bullet/respondents', [SilverBulletController::class, 'getRespondents']);
Route::get('/silver-bullet/metadata', [SilverBulletController::class, 'getSilverBulletMetadata']);