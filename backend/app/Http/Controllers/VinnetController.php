<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
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

            // Stops a double click from buying the same cards twice.
            $lock = Cache::lock('vinnet-transaction-' . $projectRespondent->id, 300);

            if(!$lock->get()){
                return response()->json([
                    'status_code' => 998,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                ], 409);
            }

            try
            {
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

                return $this->dispatch_vinnet_cards($vinnetService, $projectRespondent, $tokenRecord, intval($price), $serviceCode, $phoneNumber, $deliveryMethod);
            } finally {
                $lock->release();
            }
        } catch(\Exception $e) {
            
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => $e->getCode(),
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Buys as many Vinnet cards as needed to make up $price (e.g. 350K = 300K + 50K) and sends
     * every code in one SMS. Safe to call again after a failure: cards already bought are kept,
     * and a card whose result is unknown is checked with Vinnet before anything new is bought.
     */
    private function dispatch_vinnet_cards(VinnetService $vinnetService, ProjectRespondent $projectRespondent, $tokenRecord, int $price, string $serviceCode, string $phoneNumber, ?string $deliveryMethod)
    {
        $temporaryErrorResponse = function () use ($projectRespondent) {
            $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);

            return response()->json([
                'status_code' => 998,
                'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
            ], 404);
        };

        // Authentication Token API

        try
        {
            $tokenData = $vinnetService->authenticate_token();

            if($tokenData['code'] != 0)
            {
                Log::error('Authentication Token API Exception: ' . $tokenData['message']);

                return $temporaryErrorResponse();
            }
        } catch (\Throwable $e) {
            Log::error('Authentication Token API Exception: ' . $e->getMessage());

            $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);

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
                                        null,
                                        $serviceCode,
                                        $tokenData['token'],
                                        null
                                    );

            if($serviceItemsData['code'] != 0)
            {
                Log::error('Vinnet: Query Service API Exception: ' . $serviceItemsData['message']);

                return $temporaryErrorResponse();
            }
        } catch(\Throwable $e){
            Log::error('Google Cloud: Query Service API Exception: ' . $e->getMessage());

            $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);

            return response()->json([
                'status_code' => 999,
                'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
            ], 404);
        }

        $cardItems = [];

        foreach($serviceItemsData['service_items'] as $serviceItem){
            $cardItems[intval($serviceItem['itemValue'])] = $serviceItem;
        }

        Log::info('Vinnet card values: ', array_keys($cardItems));

        // Settle cards left unconfirmed by an earlier attempt before deciding what is still owed.
        $newlyVerified = false;
        $reusableTransactions = [];

        $unsettledTransactions = $projectRespondent->vinnetTransactions()
                                        ->where('vinnet_token_status', '!=', TransactionStatus::STATUS_VERIFIED)
                                        ->orderBy('vinnet_token_order')
                                        ->get();

        foreach($unsettledTransactions as $vinnetTransaction){
            $payServiceUuid = $vinnetTransaction->vinnet_payservice_requuid;

            try
            {
                $checkedData = $vinnetService->check_transaction($tokenData['token'], $payServiceUuid);
            } catch(\Throwable $e){
                Log::error('Vinnet: Check Transaction API Exception [UUID: ' . $payServiceUuid . ']: ' . $e->getMessage());

                return $temporaryErrorResponse();
            }

            $checkedCode = intval($checkedData['code']);
            $checkedStatus = $checkedData['pay_item']['status'] ?? null;

            Log::info('Checked Transaction with Vinnet: ', [
                'uuid' => $payServiceUuid,
                'code' => $checkedCode,
                'status' => $checkedStatus
            ]);

            if($checkedCode === 0 && $checkedStatus === 1){
                //1: giao dịch thành công, không hoàn tiền KH
                $vinnetTransaction->updatePaymentServiceStatus(
                    $payServiceUuid,
                    $checkedData['pay_item'],
                    TransactionStatus::STATUS_VERIFIED,
                    TransactionStatus::VINNET_SUCCESS
                );

                $newlyVerified = true;
            } else if(($checkedCode === 0 && $checkedStatus === 3) || $checkedCode === 99){
                //3: giao dịch thất bại được hoàn tiền KH, 99: Vinnet chưa nhận giao dịch => mua lại
                $reusableTransactions[] = $vinnetTransaction;
            } else {
                //2: giao dịch đang xử lý, hoặc chưa xác định được kết quả => chờ kiểm tra lại
                Log::error('Vinnet: transaction not settled yet [UUID: ' . $payServiceUuid . ']');

                return $temporaryErrorResponse();
            }
        }

        $paidAmount = intval($projectRespondent->vinnetTransactions()
                                        ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
                                        ->sum('total_amt'));

        $remainingAmount = $price - $paidAmount;

        if($remainingAmount < 0){
            Log::warning('Vinnet: respondent already received more than the configured price', [
                'price' => $price,
                'paid_amount' => $paidAmount
            ]);
        }

        $plannedCards = $remainingAmount > 0
                            ? $vinnetService->split_amount($remainingAmount, array_keys($cardItems))
                            : [];

        if($plannedCards === null){
            Log::error(Project::STATUS_PROJECT_NOT_SUITABLE_PRICES, [
                'price' => $price,
                'remaining_amount' => $remainingAmount,
                'service_code' => $serviceCode
            ]);

            return response()->json([
                'status_code' => 903,
                'message' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                'error' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES
            ], 422);
        }

        Log::info('Vinnet card plan: ', [
            'price' => $price,
            'paid_amount' => $paidAmount,
            'cards' => $plannedCards
        ]);

        $payServiceUuid = null;

        foreach($plannedCards as $cardValue){
            $payServiceUuid = $vinnetService->generate_formated_uuid();
            Log::info('Pay Service UUID: ' . $payServiceUuid . ' [' . $cardValue . ']');

            // Persist the UUID before paying so a retry can ask Vinnet whether this card went through.
            $transactionData = [
                'vinnet_serviceitems_requuid' => $serviceItemsData['reqUuid'],
                'vinnet_payservice_requuid' => $payServiceUuid,
                'vinnet_token_requuid' => $tokenData['reqUuid'],
                'vinnet_token' => $tokenData['token'],
                'vinnet_token_status' => TransactionStatus::STATUS_PENDING_VERIFICATION
            ];

            $vinnetTransaction = array_shift($reusableTransactions);

            if($vinnetTransaction){
                $vinnetTransaction->update($transactionData);
            } else {
                $vinnetTransaction = $projectRespondent->createVinnetTransactions($transactionData + [
                    'project_respondent_id' => $projectRespondent->id,
                    'vinnet_token_order' => intval($projectRespondent->vinnetTransactions()->max('vinnet_token_order')) + 1
                ]);
            }

            try
            {
                $payItemData = $vinnetService->pay_service(
                                        $payServiceUuid,
                                        null,
                                        $serviceCode,
                                        $tokenData['token'],
                                        $cardItems[$cardValue]
                                    );

                if($payItemData['code'] != 0)
                {
                    Log::error('Vinnet: Pay Item API Exception [UUID: ' . $payServiceUuid . ']: ' . $payItemData['message']);

                    $vinnetTransaction->update([
                        'vinnet_token_status' => TransactionStatus::STATUS_ERROR,
                        'vinnet_token_message' => "Code " . $payItemData['code'] . ": " . $payItemData['message']
                    ]);

                    return $temporaryErrorResponse();
                }
            } catch (\Throwable $e) {
                Log::error("Google Cloud: Pay Service API Exception [UUID: " . $payServiceUuid . "]: " . $e->getMessage());

                $vinnetTransaction->update([
                    'vinnet_token_status' => TransactionStatus::STATUS_ERROR,
                    'vinnet_token_message' => $e->getMessage()
                ]);

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_API_FAILED);

                return response()->json([
                    'status_code' => 999,
                    'transaction_id' => $payServiceUuid,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM
                ], 400);
            }

            $vinnetTransaction->updatePaymentServiceStatus(
                $payItemData['reqUuid'],
                $payItemData['pay_item'],
                TransactionStatus::STATUS_VERIFIED,
                TransactionStatus::VINNET_SUCCESS
            );

            $newlyVerified = true;
        }

        $tokenRecord->update([
            'status' => 'blocked'
        ]);

        $verifiedTransactions = $projectRespondent->vinnetTransactions()
                                        ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
                                        ->orderBy('vinnet_token_order')
                                        ->get();

        $payServiceUuid = $payServiceUuid ?? optional($verifiedTransactions->last())->vinnet_payservice_requuid;

        // Every card was already delivered by an earlier request; nothing new to send.
        if(!$newlyVerified){
            return response()->json([
                'status_code' => 900,
                'transaction_id' => $payServiceUuid,
                'message' => TransactionStatus::SUCCESS
            ], 200);
        }

        $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_DISPATCHED);

        $messagesToSend = $verifiedTransactions->map(fn ($verifiedTransaction) => sprintf(
            "%s:Code:%s,Seri:%s,Exp:%s",
            number_format($verifiedTransaction->total_amt / 1000, 0) . 'K',
            $verifiedTransaction->card_pin_code ?? 'N/A',
            $verifiedTransaction->card_serial_no ?? 'N/A',
            $verifiedTransaction->card_expiry_date ?? 'N/A'
        ))->implode("\n");

        $messageCard = sprintf(
            "IPSOS cam on ban. Tang ban ma dien thoai:\n%s",
            $messagesToSend
        );

        if($deliveryMethod === 'sms')
        {
            $smsTransaction = $verifiedTransactions->last()->vinnetSMSTransaction()->updateOrCreate([], [
                'sms_status' => SMSStatus::PENDING
            ]);

            $apiCMCObject = new APICMCObject();

            try
            {
                $responseSMSData = $apiCMCObject->send_sms($phoneNumber, $messageCard);

            } catch(\Exception $e){
                Log::error("CMC Telecom API Error: " . $e->getMessage());

                $smsTransaction->update([
                    'sms_status' => $e->getMessage()
                ]);

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_API_FAILED);

                return response()->json([
                    'status_code' => 997,
                    'transaction_id' => $payServiceUuid,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM
                ], 404);
            }

            if(intval($responseSMSData['status']) == 1){
                $smsTransaction->updateStatus(SMSStatus::SUCCESS, intval($responseSMSData['countSms']));

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);

                return response()->json([
                    'status_code' => 900,
                    'transaction_id' => $payServiceUuid,
                    'message' => TransactionStatus::SUCCESS
                ], 200);
            } else {
                $smsTransaction->updateStatus($responseSMSData['statusDescription'], 0);

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

        return response()->json([
            'status_code' => 900,
            'transaction_id' => $payServiceUuid,
            'message' => TransactionStatus::SUCCESS
        ], 200);
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
