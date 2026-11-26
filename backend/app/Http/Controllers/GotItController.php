<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;
use App\Http\Requests\StoreProjectGotItRequest;
use App\Models\Project;
use App\Models\ProjectRespondent;
use App\Models\ProjectGotItVoucherTransaction;
use App\Models\ProjectGotItSMSTransaction;
use App\Exceptions\GotItVoucherException;
use App\Constants\SMSStatus;
use App\Constants\TransactionStatus;
use App\Services\ProjectRespondentTokenService;
use App\Services\InterviewURL;
use App\Services\APIObject;
use App\Services\ENVObject;
use App\Services\APICMCObject;
use App\Http\Requests\TransactionRequest;
use App\Http\Requests\CheckTransactionRequest;
use App\Mail\GotitNotificationMail;

class GotItController extends Controller
{
    public function get_categories(Request $request)
    {
        try{
            $apiObject = new APIObject();

            $responseData = $apiObject->get_categories();

            return response()->json($responseData);

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
    
    public function perform_transaction(TransactionRequest $request, ProjectRespondentTokenService $tokenService)
    {
        $projectRespondent = null;

        try
        {
            $validatedRequest = $request->validated();

            $token = $validatedRequest['token'] ?? null;
            $serviceType = $validatedRequest['service_type'] ?? null;
            $serviceCode = $validatedRequest['service_code'] ?? null;
            $phoneNumber = $validatedRequest['phone_number'] ?? null;
            $provider = $validatedRequest['provider'] ?? null;
            $deliveryMethod = $validatedRequest['delivery_method'] ?? null;
            $mode = $validatedRequest['mode'] ?? 'online';

            Log::info('Transaction Info: ', [
                'token' => Str::before((string) $token, '.'),
                'service_type' => $serviceType,
                'service_code' => $serviceCode,
                'phone_number' => $phoneNumber,
                'provider' => $provider,
                'delivery_method' => $deliveryMethod,
                'mode' => $mode
            ]);

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
            
            if($projectRespondent->syncEnvironment() === ProjectRespondent::ENVIRONMENT_TEST){

                Log::info('Staging Environment: ');

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);

                $tokenRecord->update([
                    'status' => 'blocked'
                ]);

                return response()->json([
                    'status_code' => 996,
                    'message' => TransactionStatus::STATUS_TRANSACTION_TEST . ' [Giá trị quà tặng: ' . $price . ']'
                ], 200);
            }

            Log::info('Live Environment:');

            // Stops a double click, or a Vinnet request for the same respondent, from buying twice.
            $lock = $projectRespondent->giftLock();

            if(!$lock->get()){
                return response()->json([
                    'status_code' => 998,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY
                ], 409);
            }

            try
            {
                return $this->dispatch_gotit_voucher($projectRespondent, $project, $price, $phoneNumber, $serviceCode, $serviceType, $provider, $deliveryMethod);
            } finally {
                $lock->release();
            }
        }
        catch (GotItVoucherException $e){
            Log::error($e->getLogContext());

            if($projectRespondent){
                $projectRespondent->updateStatus($e->getUserMessage());
            }

            return response()->json([
                'status_code' => $e->getCode(),
                'message' => $e->getUserMessage(),
            ]);
        }
        catch (\Exception $e) {
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => $e->getCode(),
                'message' => $e->getMessage(),
            ]);
        }
    }
    
    private function dispatch_gotit_voucher(ProjectRespondent $projectRespondent, Project $project, $price, string $phoneNumber, ?string $serviceCode, ?string $serviceType, ?string $provider, ?string $deliveryMethod)
    {
        // Re-opening an interview after the gift went out through the other provider must neither buy a
        // second gift nor overwrite the channel the gift was recorded under.
        $deliveredChannel = $projectRespondent->deliveredGiftChannel();

        if($deliveredChannel !== null && $deliveredChannel !== 'gotit'){
            Log::warning('Gift already delivered through another provider', [
                'project_respondent_id' => $projectRespondent->id,
                'delivered_by' => $deliveredChannel,
                'requested' => 'gotit'
            ]);

            return response()->json([
                'status_code' => ProjectRespondent::CODE_GIFT_ALREADY_DELIVERED,
                'message' => ProjectRespondent::giftAlreadyDeliveredMessage($deliveredChannel),
                'error' => ProjectRespondent::giftAlreadyDeliveredMessage($deliveredChannel)
            ], 409);
        }

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

        //Tìm loại voucher tương ứng với mức giá quà tặng
        // 17940 => 40000,
        // 6832 => 60000,
        // 9369 => 70000,
        // 9343 => 80000,
        // 6546 => 90000,

        $priceMap = [
            3088 => 10000,
            3090 => 20000,
            3555 => 30000,
            2991 => 50000,
            2992 => 100000,
            2993 => 200000,
            6440 => 300000,
            6960 => 400000,
            2994 => 500000
        ];

        $prices = array();

        foreach($priceMap as $price_id => $p){
            array_push($prices, $p);
        }

        $prices = array();
        $selectedPrices = array();

        foreach($priceMap as $price_id => $p){
            array_push($prices, $p);
        }

        if(in_array($price, $prices)){
            array_push($selectedPrices, $price);
        } else {
            $selectedPrices = $this->findSubsets($prices, $price);
        }
        
        Log::info("Mệnh giá tiền cần chuyển cho đáp viên: " . print_r($selectedPrices, true));

        if(count($selectedPrices) == 1){
            $voucher_link_type = 'v'; 
        } else {
            if(count($selectedPrices) >= 2 && count($selectedPrices) <= 5){
                $voucher_link_type = 'g'; 
            } else {
                $voucher_link_type = 'e';

                $selectedPrices = array();
                array_push($selectedPrices, $price);
            }  
        }

        Log::info('Call API GotIt');
        $apiObject = new APIObject();

        $continueTransacton = false;

        if($projectRespondent->gotitVoucherTransactions()->count() == 0){
            
            $voucherRequest = $this->generate_voucher_request($apiObject, $voucher_link_type, $phoneNumber, $selectedPrices);

            $voucherTransaction = $projectRespondent->createGotitVoucherTransactions([
                'project_respondent_id' => $projectRespondent->id,
                'transaction_ref_id' => $voucherRequest['transactionRefId'],
                'transaction_ref_id_order' => 1,
                'expiry_date' => $voucherRequest['expiryDate'],
                'order_name' => $voucherRequest['orderName'],
                'amount' => $price,
                'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_PENDING
            ]);

            $transactionRefId = $voucherRequest['transactionRefId'];

            $continueTransacton = true;
        } else {
            $hasSuccess = $projectRespondent->gotitVoucherTransactions()
                                            ->where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                                            ->exists();

            if($hasSuccess){
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

                $voucherTransaction = $projectRespondent->gotitVoucherTransactions()
                                                        ->where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                                                        ->first();
                
                $transactionRefId = $voucherTransaction->transaction_ref_id;   
                
                // Kiểm tra Transaction Ref Id có được thực hiện tiếp lệnh bên GotIt không?
                $responsedVoucher = $apiObject->check_transaction($transactionRefId);

                Log::info('Checked Transaction Ref Id with GotIt', [
                    'transaction_ref_id' => $transactionRefId,
                    'status_code' => $responsedVoucher['statusCode'] ?? null,
                    'error' => $responsedVoucher['error'] ?? null
                ]);

                if($responsedVoucher['statusCode'] == 200 && intval($responsedVoucher['error']) == 2007)
                {
                    $voucherRequest = $this->generate_voucher_request($apiObject, $voucher_link_type, $phoneNumber, $selectedPrices);

                    $voucherTransaction->update([
                        'transaction_ref_id' => $voucherRequest['transactionRefId'],
                        'expiry_date' => $voucherRequest['expiryDate'],
                        'order_name' => $voucherRequest['orderName'],
                        'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_PENDING
                    ]);

                    $transactionRefId = $voucherRequest['transactionRefId'];

                    $continueTransacton = true;
                } else {
                    $voucherData = $responsedVoucher['data'][0]['vouchers'][0];
                }
            } else {
                $voucherTransaction = $projectRespondent->gotitVoucherTransactions()
                                                        ->where('voucher_status', '!=', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                                                        ->first();
                
                $transactionRefId = $voucherTransaction->transaction_ref_id;   
                
                // Kiểm tra Transaction Ref Id có được thực hiện tiếp lệnh bên GotIt không?
                $responsedVoucher = $apiObject->check_transaction($transactionRefId);

                Log::info('Checked Transaction Ref Id with GotIt', [
                    'transaction_ref_id' => $transactionRefId,
                    'status_code' => $responsedVoucher['statusCode'] ?? null,
                    'error' => $responsedVoucher['error'] ?? null
                ]);

                if($responsedVoucher['statusCode'] == 200 && intval($responsedVoucher['error']) == 2007)
                {
                    $voucherRequest = $this->generate_voucher_request($apiObject, $voucher_link_type, $phoneNumber, $selectedPrices);

                    $voucherTransaction->update([
                        'transaction_ref_id' => $voucherRequest['transactionRefId'],
                        'expiry_date' => $voucherRequest['expiryDate'],
                        'order_name' => $voucherRequest['orderName'],
                        'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_PENDING
                    ]);

                    $transactionRefId = $voucherRequest['transactionRefId'];

                    $continueTransacton = true;
                } else {
                    $voucherData = $responsedVoucher['data'][0]['vouchers'][0];
                }
            }
        }
        
        if($continueTransacton)
        {
            try
            {
                $responsedVoucher = $apiObject->get_vouchers($voucher_link_type, $voucherRequest);

                if($voucher_link_type === 'e'){
                    $voucherData = $responsedVoucher['vouchers'][0];
                } else if ($voucher_link_type === 'v') {
                    $voucherData = $responsedVoucher['vouchers'][0];
                } else {
                    $voucherData = $responsedVoucher;
                }

                Log::info('GotIt vouchers issued', ['transaction_ref_id' => $transactionRefId]);
            }
            catch(\Exception $e){

                Log::error("GotIt API Error: " . $e->getMessage());
                
                $voucherTransaction->update([
                    'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_ERROR
                ]);

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);

                return response()->json([
                    'status_code' => 999,
                    'transaction_id' => $transactionRefId,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM
                ], 400);
            }
        } 
        
        $updateRespondentStatus = $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_WAITING_FOR_GIFT);
        
        Log::info('Store the information of voucher.');

        $messagesToSend = "";
        $expiredDate = "";

        if($voucher_link_type === 'e'){

            $voucherTransaction->update([
                'voucher_link' => $voucherData['voucher_link'],
                'voucher_link_code' => substr($voucherData['voucher_link'], -8),
                'voucher_serial' => $voucherData['voucher_serial'],
                'voucher_value' => $voucherData['value'],
                'voucher_expired_date' => $voucherData['expired_date'],
                'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS
            ]);
            
            $messagesToSend = sprintf(
                "IPSOS cam on ban tham gia chia se, IPSOS tang ban phan qua tri gia %svnd. Mo qua tai: %s HSD %s",
                $price ?? 'N/A',
                $voucherData['voucher_link'] ?? 'N/A',
                $voucherData['expired_date'] ?? 'N/A'
            );

        } else if ($voucher_link_type === 'v') {
            
            $voucherTransaction->update([
                'voucher_code' => $voucherData['voucherCode'],
                'voucher_link' => $voucherData['voucherLink'],
                'voucher_serial' => $voucherData['voucherSerial'],
                'voucher_value' => $voucherData['product']['price']['priceValue'],
                'voucher_expired_date' => $voucherData['expiryDate'],
                'voucher_product_id' => $voucherData['product']['productId'],
                'voucher_price_id' => $voucherData['product']['price']['priceId'],
                'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS
            ]);

            $messagesToSend = sprintf(
                "IPSOS cam on ban tham gia chia se, IPSOS tang ban phan qua tri gia %svnd. Mo qua tai: %s HSD %s",
                $price ?? 'N/A',
                $voucherData['voucherLink'] ?? 'N/A',
                $voucherData['expiryDate'] ?? 'N/A'
            );
        } else {
            if(array_key_exists("groupVouchers", $voucherData)){
                $groupLink = $voucherData['groupVouchers']['voucherLink'];
                $expiredDate = $voucherData['vouchers'][0]['expired_date'];

                $voucherTransaction->update([
                    'voucher_link_group' => $voucherData['groupVouchers']['voucherLink'],
                    'voucher_link_code_group' => $voucherData['groupVouchers']['voucherLinkCode'],
                    'voucher_serial_group' => $voucherData['groupVouchers']['voucherSerial'],
                    'voucher_expired_date' => $voucherData['vouchers'][0]['expired_date'],
                    'voucher_value' => $price,
                    'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS
                ]);
            } else {
                $groupLink = $voucherData['groupLink'];
                $expiredDate = $voucherData['expiryDate'];

                $voucherTransaction->update([
                    'voucher_link_group' => $voucherData['groupLink'],
                    'voucher_link_code_group' => substr($voucherData['groupLink'], -8),
                    'voucher_serial_group' => $voucherData['groupVoucherSerial'],
                    'voucher_expired_date' => $voucherData['expiryDate'],
                    'voucher_value' => $price,
                    'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS
                ]);
            }
            

            $messagesToSend = sprintf(
                "IPSOS cam on ban tham gia chia se, IPSOS tang ban phan qua tri gia %svnd. Mo qua tai: %s HSD %s",
                $price ?? 'N/A',
                $groupLink ?? 'N/A',
                $expiredDate ?: 'N/A'
            );
        }

        $updateRespondentStatus = $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_DISPATCHED);

        Log::info('Generate a SMS request');

        $projectRespondent->token()->update([
            'status' => 'blocked'
        ]);

        $messageCard = sprintf(
            "%s",
            $messagesToSend ?? 'N/A'
        );
        
        if($continueTransacton && $deliveryMethod === 'sms')
        {   
            $smsTransaction = $voucherTransaction->createGotitSMSTransaction([
                'voucher_transaction_id' => $voucherTransaction->id,
                'transaction_ref_id' => $transactionRefId,
                'sms_status' => SMSStatus::PENDING
            ]);
            
            $apiCMCObject = new APICMCObject();

            try{
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
                    'status_code' => 999,
                    'transaction_id' => $transactionRefId,
                    'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM,
                    'error' => ProjectRespondent::ERROR_RESPONDENT_GIFT_SYSTEM
                ], 404);
            }

            if(intval($responseSMSData['status']) == 1){
                $smsTransactionStatus = $smsTransaction->updateStatus(SMSStatus::SUCCESS, intval($responseSMSData['countSms']));

                $updateRespondentStatus = $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);

                return response()->json([
                    'status_code' => 900,
                    'transaction_id' => $transactionRefId,
                    'message' => TransactionStatus::SUCCESS
                ], 200);
            } else {
                $smsTransactionStatus = $smsTransaction->updateStatus($responseSMSData['statusDescription'], 0);

                $updateRespondentStatus = $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_NOT_RECEIVED);

                Log::error(SMSStatus::ERROR . ' [' . $responseSMSData['statusDescription'] . ']');

                return response()->json([
                    'status_code' => 997,
                    'transaction_id' => $transactionRefId,
                    'message' => SMSStatus::ERROR . ' [' . $responseSMSData['statusDescription'] . ']',
                    'error' => SMSStatus::ERROR . ' [' . $responseSMSData['statusDescription'] . ']',
                ], 400);
            }
        }

        $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);
        
        return response()->json([
            'status_code' => 900,
            'transaction_id' => $transactionRefId,
            'message' => TransactionStatus::SUCCESS
        ], 200);
    }

    private function generate_voucher_request($apiObject, $voucher_link_type, $phone_number, $prices)
    {
        $time=strtotime(date('Y-m-d'));
        $month = (int)date("n", $time);
        $year = (int)date("Y", $time);

        if ($month < 6){
            $month = 12;
        } else {
            $month = 6;
            $year += 1;
        }
        
        $expiryDate =  new \DateTime("{$year}-{$month}-01");
        $orderName = 'IPSOS Promotion - ' . date("M Y");

        $apiObject->setTransactionRefId();
        $apiObject->setSignatureData("VOUCHER " . strtoupper($voucher_link_type), $orderName, $expiryDate->format('Y-m-d'));

        $signature = $apiObject->generate_signature();

        $priceMap = [
            3088 => 10000,
            3090 => 20000,
            3555 => 30000,
            2991 => 50000,
            2992 => 100000,
            2993 => 200000,
            6440 => 300000,
            6960 => 400000,
            2994 => 500000
        ];

        if($voucher_link_type === 'e' || $voucher_link_type === 'v'){
            $dataRequest = [
                "isConvertToCoverLink" => 0,
                "orderName" => $orderName,
                "expiryDate" => $expiryDate->format('Y-m-d'),
                "receiver_name" => $orderName,
                "transactionRefId" => $apiObject->getTransactionRefId(),
                "use_otp" => 0,
                // "otp_type" => 1,    
                // "phone" => $phone_number,
            ];

            if($voucher_link_type === 'e')
            {
                $dataRequest["amount"] = $prices[0];
                $dataRequest["signature"] = $signature;
            } 

            if($voucher_link_type === 'v')
            {
                $dataRequest['quantity'] = 1;
                $dataRequest['productId'] = 1541;

                foreach($priceMap as $price_id => $p){
                    if($prices[0] === $p){
                        $dataRequest['productPriceId'] = $price_id;
                        break;
                    }
                }

                $dataRequest["signature"] = $signature;
            }
        } else {
            $projectList = [];

            foreach($prices as $price){
                foreach($priceMap as $price_id => $p){
                    if($price === $p){
                        $projectList[] = [
                            "productId" => 1541,
                            "productPriceId" => $price_id,
                            "quantity" => 1
                        ];
                        break;
                    }
                }
            }

            $dataRequest = [
                "productList" => $projectList,
                "orderName" => $orderName,
                "expiryDate" => $expiryDate->format('Y-m-d'),
                "receiver_name" => $orderName,
                "transactionRefId" => $apiObject->getTransactionRefId(),
                "use_otp" => 0,
                // "otp_type" => 1,    
                "phone" => $phone_number,
            ];

            $dataRequest["signature"] = $signature;
        }

        Log::info('Voucher Request: ' . json_encode($dataRequest));

        return $dataRequest;
    }
    
    private function generate_sms_request($apiObject, $voucher_link, $phone_number)
    {
        $apiObject->setTransactionRefId();
        $apiObject->setSignatureData('SMS', null, null);

        $signature = $apiObject->generate_signature();

        $dataRequest = [
            "voucherLinkCode" => substr($voucher_link, -8),
            "phoneNo" => $phone_number,
            "receiverNm" => "Got It",
            "senderNm" => "Got It",
            "signature" => $signature
        ];

        return $dataRequest;
    }

    public function check_transaction(CheckTransactionRequest $request, ProjectRespondentTokenService $tokenService){

        try{
            $validatedRequest = $request->validated();

            $token = $validatedRequest['token'] ?? null;
            $transaction_id = $validatedRequest['transaction_id'] ?? null;

            Log::info("Check Transaction RefId: " . $transaction_id);

            try
            {
                $tokenService->respondentForTransactionLookup((string) $token, (string) $transaction_id);
            } catch(\Exception $e) {
                return response()->json([
                    'status_code' => 995,
                    'message' => TransactionStatus::STATUS_INVALID_TRANSACTION
                ], 403);
            }

            $apiObject = new APIObject();

            $responsedVoucher = $apiObject->check_transaction($transaction_id);

            if($responsedVoucher['statusCode'] == 200 && empty($responsedVoucher['error'])){
                if(empty($responsedVoucher['data'][0]['vouchers'][0]['groupLink'])){
                    $voucherLink = $responsedVoucher['data'][0]['vouchers'][0]['voucherLink'];
                } else {
                    $voucherLink = $responsedVoucher['data'][0]['vouchers'][0]['groupLink'];
                }

                return response()->json([
                    'status_code' => 900,
                    'message' => 'Successful request.',
                    'data' => $voucherLink
                ]);
            } else {
                return response()->json([
                    'status_code' => 995,
                    'message' => TransactionStatus::STATUS_INVALID_TRANSACTION . " [" . $responsedVoucher['message'] . "]"
                ]);
            }
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 999,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function update_gotit_voucher_link_v($interviewURL, $phone_number, $transactionRefId, $voucherData)
    {
        try
        {
            //Find the record and update the status
            $query = ProjectRespondent::query();
            $query->where('shell_chainid', $interviewURL->shell_chainid);
            $query->where('respondent_id', $interviewURL->shell_chainid . '-' . $interviewURL->respondent_id);
            $query->where('respondent_phone_number', $interviewURL->respondent_phone_number);
            $query->where('phone_number', $phone_number);
            $query->where('transaction_ref_id', $transactionRefId);
            $query->whereHas('project', function(Builder $query) use ($interviewURL){
                $query->where('internal_code', $interviewURL->internal_code);
                $query->where('project_name', $interviewURL->project_name);
            });

            $record = $query->first();

            if(!$record){
                Log::warning(ProjectRespondent::STATUS_TRANSACTION_NOT_EXISTS.': '.$transactionRefId);
                throw new \Exception(ProjectRespondent::STATUS_TRANSACTION_NOT_EXISTS.': '.$transactionRefId);
            }

            $record->voucher_status = ProjectRespondent::STATUS_VOUCHER_SUCCESS;
            $record->voucher_link = $voucherData['voucherLink'];
            $record->voucher_link_code = $voucherData['voucherLinkCode'];
            $record->voucher_image_link = $voucherData['voucherImageLink'];

            if(strlen($voucherData['voucherCoverLink']) > 0)
            {
                $record->voucher_cover_link = $voucherData['voucherCoverLink'];
            }
            
            $record->voucher_serial = $voucherData['voucherSerial']; 
            $record->voucher_expired_date = $voucherData['expiryDate'];

            $record->voucher_product_id = $voucherData['product']['productId'];
            $record->voucher_price_id = $voucherData['product']['price']['priceId'];
            $record->voucher_value = $voucherData['product']['price']['priceValue'];

            $record->save();

            Log::info('The information of voucher updating successful.');
        }
        catch(\Exception $e)
        {
            Log::error('The information of voucher updating failed: ' . $e->getMessage());
            throw new \Exception('The information of voucher updating failed: ' . $e->getMessage());
        }
    }
}