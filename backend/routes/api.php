<?php

use Illuminate\Http\Request;
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
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\CatiAuthMiddleware;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\TradeUnionRecipientListController;
use App\Http\Controllers\AccountDepositController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\NotificationController;

Route::post('/login', [LoginController::class, 'login'])
    ->name('index');

Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [ResetPasswordController::class, 'reset']);

Route::get('/test-mail', function () {
    Password::sendResetLink([
        'email' => 'longlh112633@gmail.com'
    ]);

    return 'sent';
});

Route::get('/administrative-divisions/old/provinces', [AdministrativeDivisionsController::class, 'get_old_provinces']);
Route::get('/administrative-divisions/old/{provinceId}/districts', [AdministrativeDivisionsController::class, 'get_old_districts']);
Route::get('/administrative-divisions/new/provinces', [AdministrativeDivisionsController::class, 'get_provinces']);
Route::get('/administrative-divisions/new/{provinceId}/districts', [AdministrativeDivisionsController::class, 'get_districts']);

Route::get('/project-management/metadata', [MetadataController::class, 'index']);

Route::get('/project-management/departments', [DepartmentController::class, 'index']);
Route::get('/project-management/{department_id}/teams', [DepartmentController::class, 'get_teams']);

Route::middleware(['auth:sanctum'])->group(function(){
    Route::get('/users/show', [UserController::class, 'index'])->middleware('ensureUserHasRole:admin');
    Route::post('/users', [UserController::class, 'store'])->middleware('ensureUserHasRole:admin');
    Route::post('/logout', [LoginController::class, 'logout']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'countUnRead']);

    //View Projects
    Route::get('/project-management/projects', [ProjectController::class, 'index'])
        ->middleware('ensureUserHasRole:Admin,Scripter,Field Manager');

    //View Project
    Route::get('/project-management/projects/{projectId}/show', [ProjectController::class, 'show'])
        ->middleware('ensureUserHasRole:Admin,Scripter');

    Route::post('/project-management/projects/store', [ProjectController::class, 'store'])->middleware('ensureUserHasRole:Admin,Scripter');
    Route::put('/project-management/projects/{projectId}/update', [ProjectController::class, 'update'])->middleware('ensureUserHasRole:admin');
    Route::put('/project-management/projects/{projectId}/status', [ProjectController::class, 'updateStatus'])->middleware('ensureUserHasRole:Admin,Scripter');
    Route::put('/project-management/projects/{projectId}/disabled', [ProjectController::class, 'updateDisabled'])->middleware('ensureUserHasRole:Admin');
    Route::put('/project-management/projects/{projectId}/update-info', [ProjectController::class, 'updateProjectInfo'])->middleware('ensureUserHasRole:Admin');
    Route::put('/project-management/projects/{projectId}/assign-users', [ProjectController::class, 'assignUsers'])->middleware('ensureUserHasRole:Admin,Researcher,Scripter,Field Manager');

    Route::delete('/project-management/projects/{projectId}/provinces/{provinceId}/remove', [ProjectController::class, 'removeProvinceFromProject'])->middleware('ensureUserHasRole:Admin');

    Route::get('project-management/projects/{projectId}/transactions/show', [TransactionController::class, 'show'])->middleware('ensureUserHasRole:Admin,Scripter');

    Route::get('/project-management/projects/{projectId}/employees/show', [EmployeeController::class, 'index'])->middleware('ensureUserHasRole:Admin,Field Manager,Finance');
    Route::post('/project-management/projects/{projectId}/employees/store', [ProjectController::class, 'bulkAddEmployees'])->middleware('ensureUserHasRole:Admin');
    Route::delete('/project-management/projects/{projectId}/employees/{employeeId}/destroy', [ProjectController::class, 'bulkRemoveEmployee'])->middleware('ensureUserHasRole:Admin');

    Route::post('/project-management/projects/{projectId}/offline/respondents/store', [ProjectRespondentController::class, 'bulkImportOfflineProjectRespondents'])->middleware('ensureUserHasRole:Admin');
    Route::get('/project-management/projects/{projectId}/offline/respondents/show', [ProjectRespondentController::class, 'show'])->middleware('ensureUserHasRole:Admin');
    Route::delete('/project_management/projects/{projectId}/offline/respondents/{projectRespondentId}/destroy', [ProjectRespondentController::class, 'bulkRemoveProjectRespondent'])->middleware('ensureUserHasRole:Admin');
    Route::post('/project-management/projects/{projectId}/offline/respondents/{projectRespondentId}/transaction', [GotItController::class, 'perform_offline_transaction'])->middleware('ensureUserHasRole:Admin');

    //MiniCATI
    Route::get('/project-management/projects/{projectId}/mini-cati/batches/show', [CATIController::class, 'index'])->middleware('ensureUserHasRole:Admin,Scripter,Field Manager');
    Route::post('/project-management/projects/{projectId}/mini-cati/batch/import', [ImportController::class, 'importCATIRespondents'])->middleware('ensureUserHasRole:Admin,Scripter,Field Manager');
    Route::delete('/project-management/projects/{projectId}/mini-cati/batch/{batchId}/destroy', [CATIController::class, 'destroyBatch'])->middleware('ensureUserHasRole:Admin,Scripter,Field Manager');
    Route::put('/project-management/projects/{projectId}/mini-cati/batch/{batchId}/update-status', [CATIController::Class, 'updateState'])->middleware('ensureUserHasRole:Admin,Scripter,Field Manager');

    //Vinnet
    Route::get('/transaction-management/vinnet/merchant/view', [VinnetController::class, 'get_merchant_info'])->middleware('ensureUserHasRole:Admin,Finance');
    Route::post('/transaction-management/vinnet/change-key', [VinnetController::class, 'change_key'])->middleware('ensureUserHasRole:Admin,Finance');
    Route::get('/transaction-management/vinnet/merchantinfo', [VinnetController::class, 'merchantinfo'])->middleware('ensureUserHasRole:Admin,Finance');

    //Got It
    Route::post('/transaction-management/gotit/account/store', [AccountDepositController::class, 'store'])->middleware('ensureUserHasRole:admin,Finance');
    Route::get('/transaction-management/gotit/account/{accountType}/view', [AccountDepositController::class, 'getGotItAccount'])->middleware('ensureUserHasRole:admin,Finance');

    //Quotation
    Route::get('/project-management/projects/{projectId}/quotation-template', [QuotationTemplateController::class, 'parse'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::get('/project-management/projects/{projectId}/quotation/{versionId}/view', [QuotationController::class, 'getQuotation'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::get('/project-management/projects/{projectId}/quotation/versions', [QuotationController::class, 'getQuotationVersions'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::post('/project-management/projects/{projectId}/quotation', [QuotationController::class, 'store'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::put('/project-management/projects/{projectId}/quotation/{versionId}/update', [QuotationController::class, 'update'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::post('/project-management/projects/{projectId}/quotation/{versionId}/clone', [QuotationController::class, 'cloneVersion'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::put('/project-management/projects/{projectId}/quotation/{versionId}/submit', [QuotationController::class, 'submit'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::delete('/project-management/projects/{projectId}/quotation/{versionId}/destroy', [QuotationController::class, 'destroy'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::put('/project-management/projects/{projectId}/quotation/{versionId}/approve', [QuotationController::class, 'approve'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');
    Route::post('/project-management/projects/{projectId}/quotation/reject', [QuotationController::class, 'reject'])->middleware('ensureUserHasRole:Admin,Researcher,Field Manager');

    //Trade Union Recipient
    Route::get('/trade-union/recipient-lists', [TradeUnionRecipientListController::class, 'index'])->middleware('ensureUserHasRole:admin');
    Route::post('/trade-union/recipient-lists/import', [ImportController::class, 'importRecipients'])->middleware('ensureUserHasRole:admin');
    Route::post('/trade-union/recipient-lists/{id}/send-email', [TradeUnionRecipientListController::class, 'sendEmail'])->middleware('ensureUserHasRole:admin');

    //Export
    Route::get('/transaction-management/export', [ExportController::class, 'exportTransaction'])->middleware('ensureUserHasRole:admin,Finance');
    Route::get('/transaction-management/projects/export', [ExportController::class, 'exportTransactionByProjects'])->middleware('ensureUserHasRole:admin,Finance');
});

Route::get('/project-management/project/verify_token', [TransactionController::class, 'verify']);
Route::post('/project-management/project/authenticate_token', [TransactionController::class, 'authenticate_token']);
Route::post('/project-management/project/refusal-transaction', [TransactionController::class, 'refusal_transaction']);

Route::post('/project-management/vinnet/transaction', [VinnetController::class, 'perform_transaction']);
Route::post('/project-management/vinnet/check-transaction', [VinnetController::class, 'check_transaction']);

Route::post('/project-management/gotit/transaction', [GotItController::class, 'perform_transaction']);
Route::post('/project-management/gotit/check-transaction', [GotItController::class, 'check_transaction']);







Route::get('/techcombank-panel/users', [TechcombankPanelController::class, 'index']);
Route::get('/techcombank-panel/{table_name}/{column_name}', [TechcombankPanelController::class, 'getCount']);
Route::get('/techcombank-panel/total-members', [TechcombankPanelController::class, 'getTotalMembers']);
Route::get('/techcombank-panel/provinces', [TechcombankPanelController::class, 'getProvince']);
Route::get('/techcombank-panel/age-group', [TechcombankPanelController::class, 'getAgeGroup']);
Route::get('/techcombank-panel/occupation', [TechcombankPanelController::class, 'getOccupation']);
Route::get('/techcombank-panel/channels', [TechcombankPanelController::class, 'getChannels']);
Route::get('/techcombank-panel/products', [TechcombankPanelController::class, 'getProducts']);
Route::get('/techcombank-panel/venn-products', [TechcombankPanelController::class, 'getVennProducts']);
Route::get('/techcombank-panel/panellist', [TechcombankPanelController::class, 'getPanellist']);

Route::get('/techcombank-panel/surveys', [TechcombankSurveysController::class, 'index']);

Route::post('/cmc-telecom/sendsms', [VinnetController::class, 'cmc_telecom_send_sms']);

Route::get('/generate-qr', [QrCodeController::class, 'generate']);
Route::get('/test_sms', [VinnetController::class, 'test_sms']);

//CUSTOM VOUCHER
Route::post('/custom-voucher/authenticate-token', [CustomVouchersController::class, 'authenticateToken']);
Route::post('/custom-voucher/assign', [CustomVouchersController::class, 'assignVoucher']);
Route::post('/custom-voucher/search-link', [CustomVouchersController::class, 'searchLink']);

//Mini-CATI
Route::get('/cati-projects/show', [CatiController::class, 'getCATIProjects']);
Route::post('/cati-project/login', [CatiController::class, 'catiLogin']);

Route::middleware(['catiAuthMiddleware'])->group(function() {
    Route::post('/next', [CatiController::class, 'getCatiRespondent']);
    Route::post('/update-status', [CatiController::class, 'updateStatus']);
    Route::get('/filters', [CatiController::class, 'filters']);
    Route::get('/suspended', [CatiController::class, 'getSuspended']);
});

