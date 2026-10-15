<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use GuzzleHttp\Client;
use Ramsey\Uuid\Uuid;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Project;
use App\Models\Employee;
use App\Models\ProjectVinnetTransaction;
use App\Models\ProjectVinnetSMSTransaction;
use App\Models\ProjectRespondent;
use App\Models\VinnetUUID;
use App\Http\Requests\TransactionRequest;
use App\Http\Requests\CheckTransactionRequest;
use App\Http\Resources\VinnetProjectResource;
use App\Constants\SMSStatus;
use App\Constants\TransactionStatus;
use App\Services\ProjectRespondentTokenService;
use App\Services\VinnetService;
use App\Services\InterviewURL;
use App\Services\ENVObject;
use App\Services\APICMCObject;

class VinnetController extends Controller
{
    /** 
     * Get the merchant information
     * 
     * @param string $request
     * @return json
     * @throws Exception
    */
    public function get_merchant_info(Request $request)
    {
        try{
            $envObject = new ENVObject();
            
            Log::info('Enviroment: ' . $envObject->environment);

            return response()->json([
                'status_code' => Response::HTTP_OK, //200
                'message' => 'Successful request.',
                'data' => $envObject->merchantInfo
            ], Response::HTTP_OK);

        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST, //400
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    private function findSubsets($nums, $target_sum) 
    {
        $subset = [];
        rsort($nums); // Sort in reverse order
    
        function backtrack($index, $current_sum, $nums, $target_sum, &$subset) {
            if ($current_sum == $target_sum) {
                return;
            }
    
            if ($index == count($nums) || $current_sum > $target_sum) {
                return;
            }
    
            $subset[] = $nums[$index];
            backtrack($index, $current_sum + $nums[$index], $nums, $target_sum, $subset);
    
            if ($current_sum + $nums[$index] > $target_sum) {
                array_pop($subset);
                backtrack($index + 1, $current_sum, $nums, $target_sum, $subset);
            }
        }
    
        backtrack(0, 0, $nums, $target_sum, $subset);
        return $subset;
    }

    /**
     * 
     * Perform multiple transactions simultaneously
     * 
     * @param request
     * 
     * @return string
     * 
     */
    public function perform_transaction(TransactionRequest $request, ProjectRespondentTokenService $tokenService, VinnetService $vinnetService)
    {
        try
        {
            $validatedRequest = $request->validated();

            $token = $validatedRequest['token'] ?? null;
            $serviceType = $validatedRequest['service_type'] ?? null;
            $requestedServiceCode = $validatedRequest['service_code'] ?? null;
            $phoneNumber = $validatedRequest['phone_number'] ?? null;
            $provider = $validatedRequest['provider'] ?? null;
            $deliveryMethod = $validatedRequest['delivery_method'] ?? null;
            $mode = $validatedRequest['mode'] ?? 'online';

            // The card service code must come from the backend catalogue: clients have sent
            // top-up codes (e.g. S0003) that Vinnet accepts but that cannot buy a card.
            $serviceCode = $vinnetService->get_service_code($phoneNumber);

            Log::info('Transaction Info: ', [
                'token' => $token,
                'service_type' => $serviceType,
                'requested_service_code' => $requestedServiceCode,
                'service_code' => $serviceCode,
                'phone_number' => $phoneNumber,
                'provider' => $provider,
                'delivery_method' => $deliveryMethod,
                'mode' => $mode
            ]);

            if(!$serviceCode){
                return response()->json([
                    'status_code' => 904,
                    'message' => ProjectRespondent::ERROR_INVALID_RESPONDENT_PHONE_NUMBER . ' Vui lòng kiểm tra lại.',
                    'error' => ProjectRespondent::ERROR_INVALID_RESPONDENT_PHONE_NUMBER
                ], 409);
            }

            $tokenRecord = $mode === 'offline'
                ? $tokenService->verifyTokenOffline($token)
                : $tokenService->verifyToken($token);

            $projectRespondent = $tokenRecord->projectRespondent;
            
            $project = $projectRespondent->project;
            
            Log::info('Project: ' . $project);

            //Tìm thông tin dự án đã được set up giá dựa trên dữ liệu từ Interview URL
            try {
                $price = $project->getPriceForProvince($projectRespondent->province_id, $projectRespondent->price_level);
            } catch(\Exception $e){

                Log::error($e->getMessage());

                return response()->json([
                    'status_code' => 903,
                    'message' => $e->getMessage() . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                    'error' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES
                ], 404);
            }

            if($price == 0)
            {   
                Log::error(Project::STATUS_PROJECT_NOT_SUITABLE_PRICES);
                
                return response()->json([
                    'status_code' => 903,
                    'message' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                    'error' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES
                ], 422);
            }

            Log::info('Price item by province: ' . intval($price));
            
            if($projectRespondent->environment === 'test'){

                Log::info('Environment: Staging');

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);

                $tokenRecord->update([
                    'status' => 'blocked'
                ]);

                return response()->json([
                    'status_code' => 996,
                    'message' => TransactionStatus::STATUS_TRANSACTION_TEST . ' [Giá trị quà tặng: ' . $price . ']'
                ], 200);
            }

            Log::info('Environment: Live');

            if($deliveryMethod === 'sms'){
                try
                {
                    //Kiểm tra số điện thoại đáp viên nhập đã được nhận quà trước đó hay chưa?
                    ProjectRespondent::checkGiftPhoneNumber($project, $phoneNumber);

                } catch(\Exception $e){
                    return response()->json([
                        'status_code' => 905,
                        'message' => $e->getMessage() . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                        'error' => $e->getMessage()
                    ], 409);
                }
            }

            $projectRespondent->update([
                'phone_number' => $phoneNumber,
                'service_code' => $serviceCode,
                'service_type' => $serviceType,
                'channel' => $provider,
                'delivery_method' => $deliveryMethod
            ]); 
            
            // Authentication Token API

            try
            {
                $tokenData = $vinnetService->authenticate_token();

                if($tokenData['code'] != 0)
                {
                    Log::error('Authentication Token API Exception: ' . $tokenData['message']);

                    $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
                    
                    return response()->json([
                        'status_code' => 998,
                        'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                        'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                    ], 404);
                }
            } catch (\Throwable $e) {
                Log::error('Authentication Token API Exception: ' . $e->getMessage());

                if(isset($projectRespondent)){
                    $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
                }

                return response()->json([
                    'status_code' => 999,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                ], 404);
            }

            // Query Service API
            try
            {
                $serviceItemsData = $vinnetService->query_service(
                                            null,// $validatedRequest['phone_number'], 
                                            $serviceCode, 
                                            $tokenData['token'], 
                                            null
                                        );
                                        
                if($serviceItemsData['code'] != 0)
                {
                    Log::error('Vinnet: Query Service API Exception: ' . $serviceItemsData['message']);

                    if(isset($projectRespondent)){
                        $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
                    }

                    return response()->json([
                        'status_code' => 998,
                        'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                        'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                    ], 404);
                }
            } catch(\Throwable $e){
                Log::error('Google Cloud: Query Service API Exception: ' . $e->getMessage());

                if(isset($projectRespondent)){
                    $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
                }

                return response()->json([
                    'status_code' => 999,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                ], 404);
            }
            
            $prices = $vinnetService->get_prices(strtoupper($serviceCode));

            Log::info('Prices: ', $prices);

            $selectedServiceItem = null;

            foreach($serviceItemsData['service_items'] as $serviceItem){
                
                if($serviceItem['itemValue'] === $price){
                    $selectedServiceItem = $serviceItem;
                    break;
                }
            }

            if (!$selectedServiceItem) {
                Log::error(Project::STATUS_PROJECT_NOT_SUITABLE_PRICES, [
                    'price' => $price,
                    'service_code' => $serviceCode
                ]);
                
                return response()->json([
                    'status_code' => 903,
                    'message' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                    'error' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES
                ], 422);
            }

            Log::info('Selected Service Item: '  . json_encode($selectedServiceItem));

            if($projectRespondent->vinnetTransactions()->count() == 0){
                $payServiceUuid = $vinnetService->generate_formated_uuid();
                Log::info('Pay Service UUID: ' . $payServiceUuid);
                
                $vinnet_token_order = 1;

                $vinnetTransaction = $projectRespondent->createVinnetTransactions([
                    'project_respondent_id' => $projectRespondent->id,
                    'vinnet_serviceitems_requuid' => $serviceItemsData['reqUuid'],
                    'vinnet_payservice_requuid' => $payServiceUuid,
                    'vinnet_token_requuid' => $tokenData['reqUuid'],
                    'vinnet_token' => $tokenData['token'],
                    'vinnet_token_order' => $vinnet_token_order,
                    'vinnet_token_status' => TransactionStatus::STATUS_PENDING_VERIFICATION
                ]);
            } else {
                $hasSuccess = $projectRespondent->vinnetTransactions()
                                                        ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
                                                        ->exists();

                if($hasSuccess){
                    $vinnetTransaction = $projectRespondent->vinnetTransactions()
                                                        ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
                                                        ->first();
                    
                    $payServiceUuid = $vinnetTransaction->vinnet_payservice_requuid;

                    // Log::warning(
                    //     ProjectRespondent::ERROR_DUPLICATE_RESPONDENT . ' [Trường hợp Đáp viên đã tồn tại và đã có thực hiện giao dịch]',
                    //     [
                    //         'respondent_id' => $projectRespondent->id
                    //     ]
                    // );

                    // //Nếu đã thực hiện giao dịch => không cho thực hiện
                    // return response()->json([
                    //     'status_code' => 905,
                    //     'message' => ProjectRespondent::ERROR_DUPLICATE_RESPONDENT,
                    //     'error' => ProjectRespondent::ERROR_DUPLICATE_RESPONDENT . ' [Trường hợp Đáp viên đã tồn tại và đã có thực hiện giao dịch]'
                    // ], 500);
                } else {
                    $vinnetTransaction = $projectRespondent->vinnetTransactions()
                                                        ->where('vinnet_token_status', '!=', TransactionStatus::STATUS_VERIFIED)
                                                        ->first();
                    
                    $payServiceUuid = $vinnetTransaction->vinnet_payservice_requuid;
                }
            }
            
            Log::info('Transaction: ' . $vinnetTransaction);

            // Kiểm tra Pay ServieUuid có được thực hiện tiếp lệnh bên Vinnet không?
            $dataRequest = $vinnetService->check_transaction($tokenData['token'], $payServiceUuid);

            Log::info('Checked Transaction with Vinnet: ', $dataRequest);
            
            $continueTransacton = false;
            $payItem = null;

            if((int)$dataRequest['code'] === 0){
                if($dataRequest['pay_item']['status'] === 1){
                    //1: giao dịch thành công, không hoàn tiền KH

                    $statusPaymentServiceResult = $vinnetTransaction->updatePaymentServiceStatus(
                                                $payServiceUuid, 
                                                $dataRequest['pay_item'], 
                                                TransactionStatus::STATUS_VERIFIED, 
                                                TransactionStatus::VINNET_SUCCESS
                                            );
                    
                    $payItem = $dataRequest['pay_item'];
                    
                    $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_DISPATCHED);

                    $tokenRecord->update([
                        'status' => 'blocked'
                    ]);

                } else if($dataRequest['pay_item']['status'] === 2){
                    //2: giao dịch đang xử lý, không được hoàn tiền KH
                    Log::error('Authentication Token API Exception: Lỗi treo từ Vinnet, chờ để kiểm tra lại');

                    $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
                    
                    return response()->json([
                        'status_code' => 998,
                        'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                        'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                    ], 404);
                } else {
                    //3: giao dịch thất bại được hoàn tiền KH

                    $payServiceUuid = $vinnetService->generate_formated_uuid();
                    Log::info('Pay Service UUID: ' . $payServiceUuid);

                    $continueTransacton = true;
                }
            } else if ((int)$dataRequest['code'] === 99){

                $continueTransacton = true;
            }

            if($continueTransacton)
            {
                try
                {
                    $payItemData = $vinnetService->pay_service(
                                            $payServiceUuid, 
                                            null, // $validatedRequest['phone_number'], 
                                            $serviceCode, 
                                            $tokenData['token'], 
                                            $selectedServiceItem
                                        );

                    if($payItemData['code'] != 0)
                    {
                        Log::error('Vinnet: Pay Item API Exception [UUID: " . $payServiceUuid . "]: ' . $payItemData['message']);

                        if(isset($vinnetTransaction)){
                            $vinnetTransaction->update([
                                'vinnet_token_status' => TransactionStatus::STATUS_ERROR,
                                'vinnet_token_message' => "Code " . $payItemData['code'] . ": " . $payItemData['message']
                            ]);
                        }

                        if(isset($projectRespondent)){
                            $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
                        }

                        return response()->json([
                            'status_code' => 998,
                            'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                            'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                        ], 404);
                    }
                } catch (\Throwable $e) {
                    Log::error("Google Cloud: Pay Service API Exception [UUID: " . $payServiceUuid . "]: " . $e->getMessage());

                    if(isset($vinnetTransaction)){
                        $vinnetTransaction->update([
                            'vinnet_token_status' => TransactionStatus::STATUS_ERROR,
                            'vinnet_token_message' => $e->getMessage()
                        ]);
                    }

                    if(isset($projectRespondent)){
                        $projectRespondent->updateStatus(ProjectRespondent::STATUS_API_FAILED);
                    }

                    return response()->json([
                        'status_code' => 999,
                        'transaction_id' => $payServiceUuid,
                        'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM,
                        'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM
                    ], 400);
                }

                $statusPaymentServiceResult = $vinnetTransaction->updatePaymentServiceStatus(
                                                    $payItemData['reqUuid'], 
                                                    $payItemData['pay_item'], 
                                                    TransactionStatus::STATUS_VERIFIED, 
                                                    TransactionStatus::VINNET_SUCCESS
                                                );
                
                $payItem = $payItemData['pay_item'];

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_DISPATCHED);

                $tokenRecord->update([
                    'status' => 'blocked'
                ]);

                $messagesToSend = sprintf(
                    "%s:Code:%s,Seri:%s,Exp:%s",
                    number_format($payItem['totalAmt'] / 1000, 0) . 'K',
                    $payItem['cardItems'][0]['pinCode'] ?? 'N/A',
                    $payItem['cardItems'][0]['serialNo'] ?? 'N/A',
                    $payItem['cardItems'][0]['expiryDate'] ?? 'N/A'
                );

                $messageCard = sprintf(
                    "IPSOS cam on ban. Tang ban ma dien thoai:\n%s",
                    $messagesToSend ?? 'N/A'
                );

                if($deliveryMethod === 'sms')
                {
                    $smsTransaction = $vinnetTransaction->createVinnetSMSTransaction([
                        'vinnet_transaction_id' => $vinnetTransaction->id,
                        'sms_status' => SMSStatus::PENDING
                    ]);

                    $apiCMCObject = new APICMCObject();
                    
                    try
                    {
                        $responseSMSData = $apiCMCObject->send_sms($phoneNumber, $messageCard);
                    
                    } catch(\Exception $e){
                        Log::error("CMC Telecom API Error: " . $e->getMessage());
                    
                        if(isset($smsTransaction)){
                            $smsTransaction->update([
                                'sms_status' => $e->getMessage()
                            ]);
                        }

                        if(isset($projectRespondent)){
                            $projectRespondent->updateStatus(ProjectRespondent::STATUS_API_FAILED);
                        }

                        return response()->json([
                            'status_code' => 997,
                            'transaction_id' => $payServiceUuid,
                            'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM,
                            'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM
                        ], 404);
                    }

                    if(intval($responseSMSData['status']) == 1){
                        $smsTransactionStatus = $smsTransaction->updateStatus(SMSStatus::SUCCESS, intval($responseSMSData['countSms']));

                        $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);

                        return response()->json([
                            'status_code' => 900,
                            'transaction_id' => $payServiceUuid,
                            'message' => TransactionStatus::SUCCESS
                        ], 200);
                    } else {
                        $smsTransactionStatus = $smsTransaction->updateStatus($responseSMSData['statusDescription'], 0);

                        $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_NOT_RECEIVED);

                        return response()->json([
                            'status_code' => 997,
                            'transaction_id' => $payServiceUuid,
                            'message' => SMSStatus::ERROR,
                            'error' => SMSStatus::ERROR
                        ], 400);
                    }
                }

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);
            }
            
            return response()->json([
                'status_code' => 900,
                'transaction_id' => $payServiceUuid,
                'message' => TransactionStatus::SUCCESS
            ], 200);
        } catch(\Exception $e) {
            
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => $e->getCode(),
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * 
     * Change key: Thay đổi mã truy cập API (merchant key).
     * 
     * @param $request
     * 
     * @return string
     * 
     */
    public function change_key(Request $request, VinnetService $vinnetService)
    {
        try{
            Log::info('Changing key');

            $envObject = new ENVObject();
            $environment = $envObject->environment;
            $merchantInfo = $envObject->merchantInfo;
            $url = $envObject->url;

            $uuid = $vinnetService->generate_formated_uuid();
            Log::info('UUID: ' . $uuid);

            $reqData = $vinnetService->encrypt_data(json_encode(['oldMerchantKey' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_KEY'])]));
            
            $signature = $vinnetService->generate_signature(str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);

            $postData = [
                'merchantCode' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']),
                'reqUuid' => $uuid,
                'reqData' => $reqData,
                'sign' => $signature
            ];

            Log::info('Data post: ' . json_encode($postData));
            
            $response = $this->post_vinnet_request(str_replace('"', '', $url) . '/changekey', null, $postData);

            $decodedResponse = json_decode($response, true);

            if ($decodedResponse === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }
            
            if (!is_array($decodedResponse)) {
                throw new \Exception('Decoded services data is not an array');
            }

            Log::info('Decoded Response Data: ' . json_encode($decodedResponse));

            Log::info('Decoded resData: '. $decodedResponse['resData']);

            $decryptedData = $this->decrypt_data($decodedResponse['resData']);

            $decodedData = json_decode($decryptedData, true);
            
            Log::info('Decoded New Merchant Key: ' . $decodedData);

            if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }
            
            $decodedData = json_decode($decodedData, true);
            
            Log::info('New merchant key: ' . $decodedData['newMerchantKey']);
            
            // Assuming the decrypted information is an array with the expected keys
            if($environment === 'production'){
                $envObject->setEnvValue('VINNET_MERCHANT_KEY', $decodedData['newMerchantKey']);
                // $envObject->updateEnv([
                //     'VINNET_MERCHANT_KEY' =>  $decodedData['newMerchantKey']
                // ]);
            } else {
                $envObject->setEnvValue('VINNET_MERCHANT_KEY_STAGING', $decodedData['newMerchantKey']);
                // $envObject->updateEnv([
                //     'VINNET_MERCHANT_KEY_STAGING' =>  $decodedData['newMerchantKey']
                // ]);
            }
            
            Log::info("The end for change key.");

            return response()->json([
                'status_code' => Response::HTTP_OK, //200
                'message' => 'Successful request.',
                'data' => $decodedData['newMerchantKey']
            ], Response::HTTP_OK);

        } catch (\Exception $e) {
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST, //400
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * MerchantInfo API: Truy vấn thông tin tài khoản đối tác tại hệ thống Vinnet (deposited / spent / balance).
     * 
     * @param $request
     * 
     * @return Object
     * 
     */
    public function merchantinfo(Request $request, VinnetService $vinnetService)
    {
        try{
            $mechantData = $vinnetService->merchantinfo();

            return response()->json([
                'data' => $mechantData['data'],
                'status_code' => 900,
                'message' => TransactionStatus::SUCCESS,
            ]);
        } catch(\Exception $e) {
            
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 999,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function check_transaction(CheckTransactionRequest $request, ProjectRespondentTokenService $tokenService, VinnetService $vinnetService)
    {
        try
        {
            $validatedRequest = $request->validated();

            $token = $validatedRequest['token'] ?? null;
            $transaction_id = $validatedRequest['transaction_id'] ?? null;

            try
            {
                $tokenData = $vinnetService->authenticate_token();

                if($tokenData['code'] != 0)
                {
                    Log::error('Authentication Token API Exception: ' . $tokenData['message']);

                    return response()->json([
                        'status_code' => 998,
                        'message' => TransactionStatus::STATUS_NOT_RECEIVED,
                        'error' => TransactionStatus::STATUS_NOT_RECEIVED
                    ], 404);
                }
            } catch (\Throwable $e) {
                Log::error('Authentication Token API Exception: ' . $e->getMessage());

                return response()->json([
                    'status_code' => 999,
                    'message' => TransactionStatus::STATUS_NOT_RECEIVED,
                    'error' => TransactionStatus::STATUS_NOT_RECEIVED
                ], 404);
            }

            try
            {
                $dataRequest = $vinnetService->check_transaction($tokenData['token'], $transaction_id);

                // Log::info('Check Transaction: ', $dataRequest);
            
                if(intval($dataRequest['code']) == 0){
                    $messagesToSend = sprintf(
                        "IPSOS cam on ban. Tang ban ma dien thoai:\n%s:Code:%s,Seri:%s,Exp:%s",
                        number_format($dataRequest['pay_item']['totalAmt'] / 1000, 0) . 'K',
                        $dataRequest['pay_item']['cardItems'][0]['pinCode'] ?? 'N/A',
                        $dataRequest['pay_item']['cardItems'][0]['serialNo'] ?? 'N/A',
                        $dataRequest['pay_item']['cardItems'][0]['expiryDate'] ?? 'N/A'
                    );

                    Log::info('Checked Transaction: ' . $messagesToSend);

                    return response()->json([
                        'data' => $messagesToSend,
                        'status_code' => 900,
                        'message' => TransactionStatus::SUCCESS,
                    ]);
                } else {
                    return response()->json([
                        'status_code' => 995,
                        'message' => TransactionStatus::STATUS_INVALID_TRANSACTION . " [" . $dataRequest['message'] . "]"
                    ]);
                }
            } catch(\Throwable $e)
            {
                return response()->json([
                    'status_code' => 999,
                    'message' => TransactionStatus::STATUS_NOT_RECEIVED,
                    'error' => TransactionStatus::STATUS_NOT_RECEIVED
                ], 404);
            }
        } catch(\Exception $e) {
            
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 999,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function test_sms(Request $request){
        $apiCMCObject = new APICMCObject();

        $phone_number = $request->input('phone_number');
        $messageCard = $request->input('message');
                    
        $responseSMSData = $apiCMCObject->send_sms($phone_number, $messageCard);
    }
    
}
