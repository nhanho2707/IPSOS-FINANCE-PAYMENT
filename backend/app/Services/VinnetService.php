<?php

namespace App\Services;

use Exception;
use Ramsey\Uuid\Uuid;
use Illuminate\Support\Facades\Log;

class VinnetService
{
    // Vinnet resCode values (API v2.0, section 5).
    const CODE_SUCCESS = 0;
    const CODE_INSUFFICIENT_BALANCE = 19;
    const CODE_TRANSACTION_NOT_FOUND = 20;
    const CODE_RESULT_UNKNOWN = 99;

    // checktransaction status values (API v2.0, section 4.9.5).
    const TRANSACTION_STATUS_SUCCESS = 1;
    const TRANSACTION_STATUS_PROCESSING = 2;
    const TRANSACTION_STATUS_REFUNDED = 3;

    // payservice recipientType: TT/TS are for top-up only, every other service sends NT (section 4.8.4).
    const RECIPIENT_TYPE_OTHER = 'NT';

    public $proviceItems = [
        "Viettel" => [
            "providerCode" => "VTT",
            "subscriberNumberPrefix" => ['086','096','097','098','0162','0163','0164','0165','0166','0167','0168','0169','032','033','034','035','036','037','038','039'],
            "serviceCode" => "S0004"
        ],
        "Vinaphone" => [
            "providerCode" => "VNP",
            "subscriberNumberPrefix" => ['091','094','088','0123','0124','0125','0127','0129','083','084','085','081','082'],
            "serviceCode" => "S0014"
        ],
        "MobiFone" => [
            "providerCode" => "VMS",
            "subscriberNumberPrefix" => ['089','090','093','0120','0121','0122','0126','0128','070','079','077','076','078'],
            "serviceCode" => "S0012"
        ],
        "Vietnamobile" => [
            "providerCode" => "VNM",
            "subscriberNumberPrefix" => ['052','092','0186','0188','056','058'],
            "serviceCode" => "S0013"
        ],
        "Gmobile" => [
            "providerCode" => "BEE",
            "subscriberNumberPrefix" => ['099','0199','059'],
            "serviceCode" => "S0011"
        ],
        "Wintel" => [
            "providerCode" => "WTL",
            "subscriberNumberPrefix" => ['055'],
            "serviceCode" => "S0015"
        ],
        "I-Telecom" => [
            "providerCode" => "I-Telecom",
            "subscriberNumberPrefix" => ['087'],
            "serviceCode" => "S0014"
        ]
    ];
    
    public $serviceItems = [
        "S0004" => [
            'label' => 'Mã thẻ nạp Viettel',
            'prices' => [ 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000, 1000000 ]
        ],
        "S0011" => [
            'label' => 'Mã thẻ nạp Gmobile',
            'prices' => []
        ],
        "S0012" => [
            'label' => 'Mã thẻ nạp Mobifone',
            'prices' => [ 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000 ]
        ],
        "S0013" => [
            'label' => 'Mã thẻ nạp Vietnamobile',
            'prices' => [ 20000, 50000, 100000, 200000, 300000, 500000 ]
        ],
        "S0014" => [
            'label' => 'Mã thẻ nạp Vinaphone',
            'prices' => [ 10000, 20000, 30000, 50000, 100000, 200000, 300000, 500000 ]
        ],
        "S0015" => [
            'label' => 'Mã thẻ nạp Wintel',
            'prices' => []
        ]
    ];

    function get_prices($serviceCode): array
    {
        return $this->serviceItems[$serviceCode]['prices'] ?? [];
    }

    /**
     * Fewest cards whose face values add up to $amount, largest first.
     * Returns null when the denominations cannot make up the amount exactly.
     */
    public function split_amount(int $amount, array $denominations): ?array
    {
        $denominations = array_values(array_unique(array_filter(array_map('intval', $denominations), fn ($value) => $value > 0)));
        rsort($denominations);

        if ($amount <= 0 || empty($denominations)) {
            return null;
        }

        $step = array_reduce($denominations, fn ($carry, $value) => $this->greatest_common_divisor($carry, $value), $amount);
        $target = intdiv($amount, $step);

        // $lastCard[$total] is the card added to reach $total with the fewest cards.
        $cardCount = [0 => 0];
        $lastCard = [];

        for ($total = 1; $total <= $target; $total++) {
            foreach ($denominations as $value) {
                $previous = $total - intdiv($value, $step);

                if ($previous < 0 || !isset($cardCount[$previous])) {
                    continue;
                }

                if (!isset($cardCount[$total]) || $cardCount[$previous] + 1 < $cardCount[$total]) {
                    $cardCount[$total] = $cardCount[$previous] + 1;
                    $lastCard[$total] = $value;
                }
            }
        }

        if (!isset($cardCount[$target])) {
            return null;
        }

        $cards = [];
        for ($total = $target; $total > 0; $total -= intdiv($lastCard[$total], $step)) {
            $cards[] = $lastCard[$total];
        }

        rsort($cards);

        return $cards;
    }

    private function greatest_common_divisor(int $a, int $b): int
    {
        return $b === 0 ? $a : $this->greatest_common_divisor($b, $a % $b);
    }

    /**
     * PIN codes are redeemable value; keep them out of the logs.
     */
    public function mask_pay_item(array $payItem): array
    {
        foreach ($payItem['cardItems'] ?? [] as $index => $cardItem) {
            $payItem['cardItems'][$index]['pinCode'] = '***';
        }

        return $payItem;
    }

    function get_service_items($price): array
    {
        $service_items = [];

        foreach($this->serviceItems as $key=>$serviceItem)
        {
            if(in_array($price, $serviceItem['prices'])){
                $service_items[] = $key;
            }
        }

        return $service_items;
    }

    function get_service_code(string $phonenumber): ?string
    {
        $phonenumber = trim($phonenumber);

        if ($phonenumber === '') {
            return null;
        }

        $length = strlen($phonenumber);

        if ($length < 10 || $length > 11) {
            return null;
        }
        
        // nếu số 11 số => lấy 4 ký tự đầu, còn lại lấy 3
        $prefix = substr($phonenumber, 0, ($length == 11 ? 4 : 3));

        foreach ($this->proviceItems as $provider) {
            if (in_array($prefix, $provider['subscriberNumberPrefix'])) {
                return $provider['serviceCode'];
            }
        }

        return null;
    }

    function getProviceByPhoneNumber(string $phoneNumber): ?string
    {
        $phone_number = trim($phoneNumber);

        if($phone_number === ''){
            return null;
        }

        if(strlen($phone_number) < 10 || strlen($phone_number) > 11){
            return null;
        }

        $prefix = substr($phone_number, 0, (strlen($phone_number) == 11 ? 4 : 3));

        foreach($this->proviceItems as $provice => $proviceData){
            if(in_array($prefix, $proviceData["subscriberNumberPrefix"])){
                return $provice;
            }
        }

        return null;
    }   

    function getProviceByServiceCode(string $serviceCode): ?string
    {
        foreach($this->proviceItems as $provice => $proviceData){
            if($proviceData["serviceCode"] == $serviceCode){
                return $provice;
            }
        }

        return null;
    }   

    public function generate_formated_uuid()
    {
        // Generate a UUID using Laravel's Str::uuid() method
        $uuid = Uuid::uuid4()->toString();
        return $uuid;
    }

    function json_validator($data) 
    { 
        if (!empty($data)) { 
            return is_string($data) &&  
              is_array(json_decode($data, true)) ? true : false; 
        } 
        return false; 
    } 

    private function encrypt_data($data)
    {
        try {
            // Log::info('Starting for encrypt data');

            // Log::info('Data to encrypt: ' . $data);
            $envObject = new ENVObject();
            
            // Load the public key from the file
            $publicKeyPath = storage_path('keys/vinnet/' . $envObject->environment . '/vinnet_public_key.pem');
            $publicKey = file_get_contents($publicKeyPath);

            // Check if the public key was successfully loaded
            if ($publicKey === false) {
                Log::error('Failed to load public key from path: ' . $publicKeyPath);
                throw new Exception('Failed to load public key from path: ' . $publicKeyPath);
            }

            // Get a public key resource
            $pubKeyId = openssl_get_publickey($publicKey);

            // Check if the key resource is valid
            if (!$pubKeyId) {
                Log::error('Public key is not valid');
                throw new Exception('Public key is not valid');
            }

            $encryptedData = '';
            $encryptionSuccess = openssl_public_encrypt($data, $encryptedData, $pubKeyId);

            // Free the key resource
            openssl_free_key($pubKeyId);

            if (!$encryptionSuccess) {
                Log::error('Encryption failed');
                throw new Exception('Encryption failed');
            }

            // Log::info('Encrypted Data: ' . $encryptedData);

            // Encode the encrypted data to base64
            $encodedData = base64_encode($encryptedData);

            // Log::info("Encode the encrypted data: " . $encodedData);

            // Log::info('The end for encrypt data');

            return $encodedData;
        } catch(Exception $e) {
            // Log the exception message
            Log::error('Data encryption failed: ' . $e->getMessage());

            // Rethrow the exception to be handled by the calling code
            throw $e;
        }
    }

    /**
     * Encrypt data
     * 
     * @param $encrypted_data
     * 
     * @return string
     * 
     */
    private function decrypt_data($encrypted_data)
    {  
        try{
            // Log the encrypted data
            // Log::info('Encrypted data: ' . $encrypted_data);
            $envObject = new ENVObject();

            $privateKey = file_get_contents(storage_path('keys/vinnet/' . $envObject->environment . '/private_key.pem'));

            // Base64 decode the encrypted data
            $decodedEncryptedData = base64_decode($encrypted_data);
            
            if ($decodedEncryptedData === false) {
                Log::error('Base64 decoding failed');
                throw new Exception('Base64 decoding failed');
            }

            // Log::info('Base64 decoding data: ' . $decodedEncryptedData);

            // Decrypt the data
            $decryptedData = '';
            
            $decryptionSuccess = openssl_private_decrypt($decodedEncryptedData, $decryptedData, $privateKey);
            
            if (!$decryptionSuccess) {
                Log::error('Decryption failed');
                throw new Exception('Decryption failed');
            }

            // Log::info('Data decryption successfully: ' . $decryptedData);

            // Validate UTF-8 encoding
            if (!mb_check_encoding($decryptedData, 'UTF-8')) {
                // Clean invalid characters
                $decryptedData = mb_convert_encoding($decryptedData, 'UTF-8', 'UTF-8');
            }

            // Clean the decrypted data (remove control characters)
            $cleanData = preg_replace('/[[:cntrl:]]/', '', $decryptedData);

            // Try removing additional characters (adjust based on your needs)
            $cleanData = trim($cleanData);
            
            // Log::info('Clean data: ' . $cleanData);
            
            // Decode the clean data as JSON
            $decodedData = json_decode($cleanData, true);

            // Log the JSON decoded data
            //Log::info('JSON validator: ' . json_encode($decodedData));
            
            // Check if 'newMerchantKey' is present
            if (!isset($decodedData['newMerchantKey']) && !isset($decodedData['token']) && !(!isset($decodedServicesData['serviceItems']) || !is_array($decodedServicesData['serviceItems']))) {
                // Log::error('newMerchantKey key is missing');
                // throw new \Exception('newMerchantKey key is missing');

                // Validate the decrypted JSON
                if(!$this->json_validator($cleanData)){
                    $decodedData = json_decode($cleanData, true);
                
                    if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                        Log::error('Malformed JSON data: ' . json_last_error_msg());
                        throw new Exception('Malformed JSON data: ' . json_last_error_msg());
                    }
                } else {
                    $decodedData = $cleanData;
                }
            } else {
                $decodedData = $cleanData;
            }
            
            // Log::info('Result data decryption: ' . $decodedData);
            
            return json_encode($decodedData);
        } catch (Exception $e){
            // Log the exception message
            Log::error('Data decryption failed: ' . $e->getMessage());

            // Rethrow the exception to be handled by the calling code
            throw $e;
        }
    }

    private function generate_signature($data)
    {
        try {
            // Log::info('Starting for generating signature');

            // Log::info('Data to generate Signature: ' . $data);
            $envObject = new ENVObject();

            // Load the public key from the file
            $privateKeyPath = storage_path('keys/vinnet/' . $envObject->environment . '/private_key.pem');
            $privateKey = file_get_contents($privateKeyPath);

            // Check if the private key was successfully loaded
            if ($privateKey === false) {
                throw new Exception('Failed to load private key');
            }

            // Get a private key resource
            $privateKeyId = openssl_get_privatekey($privateKey);

            // Check if the key resource is valid
            if (!$privateKeyId) {
                Log::error('Private key is not valid');
                throw new Exception('Private key is not valid');
            }

            // Create a signature
            $signature = '';
            $success = openssl_sign($data, $signature, $privateKeyId, OPENSSL_ALGO_SHA256);

            // Free the private key resource
            openssl_free_key($privateKeyId);

            if (!$success) {
                Log::error('Failed to sign data');
                throw new Exception('Failed to sign data');
            }

            // Log::error('Signature: '. $signature);

            // Encode the signature to base64
            $encodedSignature = base64_encode($signature);
            
            // Log::info('Encoded signature: '. $encodedSignature);

            // Log::info('The end for generating signature');

            return $encodedSignature;
        } catch (Exception $e) {
            // Log the exception message
            Log::error('Signature generation failed: ' . $e->getMessage());

            // Rethrow the exception to be handled by the calling code
            throw $e;
        }
    }

    /**
     * Verify the given signature with the data using the public key.
     *
     * @param string $data
     * @param string $signature
     * 
     * @return bool
     */
    private function verify_signature($data, $signature)
    {
        try {
            $envObject = new ENVObject();
            
            // Load the public key from the file
            $publicKey = file_get_contents(storage_path('keys/vinnet/' . $envObject->environment . '/vinnet_public_key.pem'));

            // Check if the public key was successfully loaded
            if ($publicKey === false) {
                throw new Exception('Failed to load public key');
            }

            // Get a public key resource
            $pubKeyId = openssl_get_publickey($publicKey);

            // Check if the key resource is valid
            if (!$pubKeyId) {
                throw new Exception('Public key is not valid');
            }

            // Decode the hex signature to binary
            $decoded_signature = base64_decode($signature);

            // Check if the signature was successfully decoded
            if ($decoded_signature === false) {
                throw new Exception('Failed to decode signature');
            }
            
            // Log the data and signature for debugging purposes
            // Log::info('Data to verify: ' . $data);
            // Log::info('Signature to verify (base64): ' . $decoded_signature);
            
            // Verify the signature using SHA256 with RSA
            $verify = openssl_verify($data, $decoded_signature, $pubKeyId, OPENSSL_ALGO_SHA256);

            // Free the key resource
            openssl_free_key($pubKeyId);

            // Check if the verification process encountered an error
            if ($verify !== 1) {
                throw new Exception('An error occurred during signature verification: ' . openssl_error_string());
            }
            
            // Return the verification result
            return $verify === 1;
        } catch(Exception $e) {
            // Log the exception message
            Log::error('Signature verification failed: ' . $e->getMessage());

            // Rethrow the exception to be handled by the calling code
            throw $e;
        }
    }

    private function post_vinnet_request($url, $token, $postData)
    {
        try {
            $maxRetries = 2; // Số lần thử lại nếu request thất bại
            $retryDelay = 2; // Giây chờ giữa các lần thử
            $attempt = 0;

            do {
                $attempt++;
                $startTime = microtime(true); // Bắt đầu đếm thời gian

                try {
                    // Initialize cURL session
                    $ch = curl_init($url);

                    // Convert post data to JSON format
                    $jsonData = json_encode($postData);

                    // Prepare headers
                    $header = [
                        'Content-Type: application/json',
                        'Content-Length: ' . strlen($jsonData)
                    ];

                    if (!is_null($token)) {
                        $header[] = 'Authorization: ' . $token;
                    }

                    // Log::info("POST attempt {$attempt} to URL: {$url}");
                    // Log::info('Headers: ' . implode(',', $header));
                    // Log::info('Payload: ' . $jsonData);

                    // Set cURL options
                    curl_setopt_array($ch, [
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_HTTPHEADER     => $header,
                        CURLOPT_POST           => true,
                        CURLOPT_POSTFIELDS     => $jsonData,
                        CURLOPT_CONNECTTIMEOUT => 10, // Giây tối đa chờ kết nối
                        CURLOPT_TIMEOUT        => 20, // Giây tối đa cho toàn request
                    ]);

                    // Execute request
                    $response = curl_exec($ch);
                    $duration = round(microtime(true) - $startTime, 2); // Tính thời gian thực thi

                    if (curl_errno($ch)) {
                        $curlError = curl_error($ch);
                        Log::error("cURL error (attempt {$attempt}, {$duration}s): {$curlError}");
                        curl_close($ch);

                        // Retry nếu là lỗi timeout hoặc lỗi kết nối
                        if (str_contains($curlError, 'timed out') || str_contains($curlError, 'Failed to connect')) {
                            if ($attempt < $maxRetries) {
                                Log::warning("Retrying in {$retryDelay}s...");
                                sleep($retryDelay);
                                continue;
                            }
                        }
                        throw new \Exception("Kết nối tới máy chủ Vinnet thất bại: {$curlError}");
                    }

                    // Lấy mã HTTP
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    // Log::info("Response received in {$duration}s (HTTP {$httpCode})");

                    // Kiểm tra response rỗng
                    if ($response === false || $response === null || trim($response) === '') {
                        throw new \Exception("Máy chủ Vinnet không phản hồi hoặc trả về dữ liệu rỗng");
                    }

                    // HTTP code khác 200
                    if ($httpCode !== 200) {
                        Log::error("Request failed with HTTP code {$httpCode}. Response: {$response}");
                        throw new \Exception("Request thất bại với HTTP code {$httpCode}");
                    }

                    // Kiểm tra JSON
                    if ($this->json_validator($response)) {
                        $responseData = json_decode($response, true);
                    } else {
                        Log::warning("Response không hợp lệ JSON: {$response}");
                        throw new \Exception("Response không đúng định dạng JSON");
                    }

                    // Kiểm tra trường cần thiết
                    if (!isset($responseData['reqUuid'], $responseData['resCode'], $responseData['resMesg'], $responseData['resData'], $responseData['sign'])) {
                        throw new \Exception("Response thiếu các trường cần thiết để xác thực chữ ký");
                    }

                    // Xác thực chữ ký
                    $verify_signature = $this->verify_signature(
                        $responseData['reqUuid'] . $responseData['resCode'] . $responseData['resMesg'] . $responseData['resData'],
                        $responseData['sign']
                    );

                    if (!$verify_signature) {
                        Log::error('Request failed with invalid signature');
                        throw new Exception('Xác thực chữ ký không hợp lệ (invalid signature)');
                    }

                    // Log::info('Response data: ' . json_encode($responseData));
                    return json_encode($responseData);
                } catch (Exception $innerEx) {
                    Log::error("POST attempt {$attempt} failed: " . $innerEx->getMessage());

                    // Nếu còn lượt retry → chờ rồi thử lại
                    if ($attempt < $maxRetries) {
                        Log::warning("Retrying in {$retryDelay}s...");
                        sleep($retryDelay);
                    } else {
                        throw $innerEx;
                    }
                }

            } while ($attempt < $maxRetries);

        } catch (Exception $e) {
            Log::error('POST request to Vinnet failed: ' . $e->getMessage());
            throw $e;
        }
    }

    public function merchantinfo()
    {
        try{
            Log::info("Merchant Information");
            
            $envObject = new ENVObject();
            $environment = $envObject->environment;
            $merchantInfo = $envObject->merchantInfo;
            $url = $envObject->url;

            $tokenData = $this->authenticate_token();

            $uuid = $this->generate_formated_uuid();

            $dataRequest = [];

            $reqData = $this->encrypt_data(json_encode($dataRequest));

            $signature = $this->generate_signature(str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);

            $postData = [
                'merchantCode' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']),
                'reqUuid' => $uuid,
                'reqData' => $reqData,
                'sign' => $signature
            ];

            Log::info('Merchant Information [$postData]: ' . json_encode($postData));

            $response = $this->post_vinnet_request(str_replace('"', '', $url) . '/merchantinfo', $tokenData['token'], $postData);

            $decodedResponse = json_decode($response, true);

            if ($decodedResponse === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }

            if (!is_array($decodedResponse)) {
                throw new \Exception('Decoded services data is not an array');
            }

            if($decodedResponse['resCode'] == '00')
            {
                Log::info('Merchant Info: ' . $decodedResponse['resData']);

                $decryptedData = $this->decrypt_data($decodedResponse['resData']);

                Log::info('Decrypted Merchant Info data: ' . $decryptedData);
                
                $decodedData = json_decode($decryptedData, true);

                if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON Decode Error: ' . json_last_error_msg());
                    throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
                }

                Log::info('Pay item array: ' . print_r($decodedData, true));

                return [
                    'reqUuid' => $uuid,
                    'data' => $decodedData,
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ];
            } else {
                throw new \Exception($decodedResponse['resMesg']);
            }
        } catch (Exception $e) {
            //Log the exception message
            Log::error('Merchant Information failed: ' . $e->getMessage());

            throw $e;
        }
    }

    /**
     * 
     * Authenticate Token: Lấy access token sử dụng cho các bản tin nghiệp vụ.
     * 
     * #return string
     * 
     */
    public function authenticate_token()
    {
        try{
            $envObject = new ENVObject();
            $environment = $envObject->environment;
            $merchantInfo = $envObject->merchantInfo;
            $url = $envObject->url;

            $uuid = $this->generate_formated_uuid();
            Log::info('UUID to authenticate token: ' . $uuid);

            $reqData = $this->encrypt_data(json_encode(['merchantKey' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_KEY'])]));

            //Log::info('Encrypted data: ' . $reqData);

            // Log::info('Signature: ' . str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);

            $signature = $this->generate_signature(str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);

            $postData = [
                'merchantCode' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']),
                'reqUuid' => $uuid,
                'reqData' => $reqData,
                'sign' => $signature
            ];

            $response = $this->post_vinnet_request(str_replace('"', '', $url) . '/authen', null, $postData);

            $decodedResponse = json_decode($response, true);

            if($decodedResponse === null && json_last_error() != JSON_ERROR_NONE){
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }

            if($decodedResponse['resCode'] == '00'){

                $decryptedData = $this->decrypt_data($decodedResponse['resData']);

                $decodedData = json_decode($decryptedData, true);

                if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON Decode Error: ' . json_last_error_msg());
                    throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
                }
                
                $decodedData = json_decode($decodedData, true);

                if (!is_array($decodedData)) {
                    Log::error('Decoded services data is not an array');
                    throw new \Exception('Decoded services data is not an array');
                }

                return [
                    'reqUuid' => $uuid,
                    'token' => $decodedData['token'],
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ]; 
            } else {
                throw new \Exception($decodedResponse['resMesg']);
            }
        } catch (Exception $e){
            //Log the exception message
            //Log::error('Token authentication failed: ' . $e->getMessage());

            // Optionally rethrow the exception or handle it
            throw $e;
        }
    }
    
    /**
     * 
     * Query service: Truy vấn dịch vụ từ hệ thống Vinnet.
     * 
     * @param phone_number
     * @param service_code
     * @param token
     * @param price
     * 
     * @return json
     * 
     */
    public function query_service($phone_number, $service_code, $token, $price)
    {
        try {
            $envObject = new ENVObject();
            $environment = $envObject->environment;
            $merchantInfo = $envObject->merchantInfo;
            $url = $envObject->url;

            // Validate inputs
            if (empty($service_code)|| empty($token)) {
                throw new \InvalidArgumentException('One or more required (phone_number|service_code|token) fields are empty');
            }

            $uuid = $this->generate_formated_uuid();
            Log::info('Query Service UUID: ' . $uuid);
            
            $dataRequest = [
                'serviceCode' => $service_code,
                'recipient' => $phone_number
            ];

            //Log::info('Data request: ' . json_encode($dataRequest));
            
            $reqData = $this->encrypt_data(json_encode($dataRequest));

            //Log::info('Encrypted data: ' . $reqData);

            //Log::info('Data signature: ' . env('VINNET_MERCHANT_CODE') . $uuid . $reqData);

            $signature = $this->generate_signature(str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);

            $postData = [
                'merchantCode' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']),
                'reqUuid' => $uuid,
                'reqData' => $reqData,
                'sign' => $signature
            ];

            $response = $this->post_vinnet_request(str_replace('"', '',$url) . '/queryservice', $token, $postData);

            //Log::info('Service: ' . $response);

            $decodedResponse = json_decode($response, true);

            if ($decodedResponse === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }

            if($decodedResponse['resCode'] == '00')
            {
                $resDatas = str_split($decodedResponse['resData'], 344);

                $strServices = '';

                foreach($resDatas as $resData){
                    // Log::info($resData);
                    $decryptedData = $this->decrypt_data($resData);
                    $strServices = $strServices . $decryptedData;
                    // Log::info($decryptedData);
                }

                //Log::info($strServices);
            
                $strServices = str_replace("\"\"", "", $strServices);

                //Log::info($strServices);

                //Decode JSON string to PHP array
                $decodedServicesData = json_decode(json_decode($strServices, true), true);

                if ($decodedServicesData === null && json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON Decode Error: ' . json_last_error_msg());
                    throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
                }

                //Log::info("Step 2: " . print_r($decodedServicesData, true));
            
                if (!is_array($decodedServicesData)) {
                    throw new \Exception('Decoded services data is not an array');
                }
                
                if (!isset($decodedServicesData['serviceItems']) || !is_array($decodedServicesData['serviceItems'])) {
                    throw new \Exception('serviceItems key is missing or not an array');
                }

                //Log::info("Service items: " . json_encode($decodedServicesData));

                // Access serviceItems directly as an array
                $serviceItems = $decodedServicesData['serviceItems'];
                
                //Log::info("Service items: " . json_encode($serviceItems));

                // Filter serviceItems with itemValue = $price using Laravel Collection
                
                if($price){
                    $selectedServiceItems = collect($serviceItems)->filter(function ($item) use ($price) {
                        return $item['itemValue'] === $price;
                    })->values()->first();

                    // Log::info("Service Items: " . print_r($selectedServiceItems, true) . " - Check: " . is_array($selectedServiceItems));

                    return [
                        'reqUuid' => $uuid,
                        'service_items' => array($selectedServiceItems),
                        'code' => (int)$decodedResponse['resCode'],
                        'message' => $decodedResponse['resMesg']
                    ];
                } else {
                    // Log::info("Service Items: " . print_r($serviceItems, true) . is_array($serviceItems));

                    return [
                        'reqUuid' => $uuid,
                        'service_items' => $serviceItems,
                        'code' => (int)$decodedResponse['resCode'],
                        'message' => $decodedResponse['resMesg']
                    ];
                }
            } else {
                //throw new \Exception($decodedResponse['resMesg']);
                return [
                    'reqUuid' => $uuid,
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ];
            }
        } catch (\Exception $e) {
            // Log the exception message
            Log::error('Query service failed: ' . $e->getMessage());

            // Optionally rethrow the exception or handle it
            throw $e;
        }
    }

    /**
     * 
     * Pay service: Thanh toán dịch vụ từ hệ thống Vinnet.
     * 
     * @param phone_number
     * @param service_code
     * @param token
     * @param service_item
     * 
     * @return json
     *  
     */
    public function pay_service($uuid, $phone_number, $service_code, $token, $service_item, $recipient_type = self::RECIPIENT_TYPE_OTHER)
    {
        try 
        {
            $envObject = new ENVObject();
            $environment = $envObject->environment;
            $merchantInfo = $envObject->merchantInfo;
            $url = $envObject->url;
            
            //$encodedServiceItem = json_decode($service_item, true);
            
            $dataRequest = [
                'serviceCode' => $service_code, 
                'recipient' => $phone_number,
                'recipientType' => $recipient_type,
                'serviceItem' => $service_item,
                'quantity' => 1
            ];

            // Log::info('Data request: ' . json_encode($dataRequest));
            
            $reqData = $this->encrypt_data(json_encode($dataRequest));

            // Log::info('Encrypted data: ' . $reqData);

            // Log::info('Data signature: ' . str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);

            $signature = $this->generate_signature(str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $uuid . $reqData);
            
            $postData = [
                'merchantCode' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']),
                'reqUuid' => $uuid,
                'reqData' => $reqData,
                'sign' => $signature
            ];

            $response = $this->post_vinnet_request(str_replace('"', '', $url) . '/payservice', $token, $postData);
            
            // Log::info('Pay service response: ' . $response);

            $decodedResponse = json_decode($response, true);
            
            if ($decodedResponse === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }
            
            if (!is_array($decodedResponse)) {
                throw new \Exception('Decoded services data is not an array');
            }

            if($decodedResponse['resCode'] == '00')
            {
                // Log::info('Pay service data: ' . $decodedResponse['resData']);

                $decryptedData = $this->decrypt_data($decodedResponse['resData']);

                // Log::info('Decrypted pay service data: ' . $decryptedData);
                
                $decodedData = json_decode($decryptedData, true);

                if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON Decode Error: ' . json_last_error_msg());
                    throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
                }

                $decodedData = json_decode($decodedData, true);

                if (!is_array($decodedData)) {
                    Log::error('Decoded services data is not an array');
                    throw new \Exception('Decoded services data is not an array');
                }

                Log::info('Pay item array: ' . print_r($this->mask_pay_item($decodedData), true));

                return [
                    'reqUuid' => $uuid,
                    'pay_item' => $decodedData,
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ];
            } else {
                //throw new \Exception($decodedResponse['resMesg']);
                return [
                    'reqUuid' => $uuid,
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ];
            }

        } catch (\Exception $e) {
            // Log the exception message
            Log::error('Pay service failed: ' . $e->getMessage());

            // Optionally rethrow the exception or handle it
            throw $e;
        }
    }

    public function check_transaction($token, $refReqUuid)
    {
        try 
        {
            $envObject = new ENVObject();
            $environment = $envObject->environment;
            $merchantInfo = $envObject->merchantInfo;
            $url = $envObject->url;

            $checkTransactionUuid = $this->generate_formated_uuid();
            
            $dataRequest = [
                'refReqUuid' => $refReqUuid
            ];

            $reqData = $this->encrypt_data(json_encode($dataRequest));
            
            $signature = $this->generate_signature(str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']) . $checkTransactionUuid . $reqData);

            $postData = [
                'merchantCode' => str_replace('"', '', $merchantInfo['VINNET_MERCHANT_CODE']),
                'reqUuid' => $checkTransactionUuid,
                'reqData' => $reqData,
                'sign' => $signature
            ];

            $response = $this->post_vinnet_request(str_replace('"', '', $url) . '/checktransaction', $token, $postData);

            // Log::info('Pay service response: ' . $response);

            $decodedResponse = json_decode($response, true);
            
            if ($decodedResponse === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON Decode Error: ' . json_last_error_msg());
                throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
            }
            
            if (!is_array($decodedResponse)) {
                throw new \Exception('Decoded services data is not an array');
            }

            if($decodedResponse['resCode'] == '00')
            {
                $decryptedData = $this->decrypt_data($decodedResponse['resData']);

                // Log::info('Decrypted pay service data: ' . $decryptedData);
                
                $decodedData = json_decode($decryptedData, true);

                if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON Decode Error: ' . json_last_error_msg());
                    throw new \Exception('JSON Decode Error: ' . json_last_error_msg());
                }

                $decodedData = json_decode($decodedData, true);

                if (!is_array($decodedData)) {
                    Log::error('Decoded services data is not an array');
                    throw new \Exception('Decoded services data is not an array');
                }

                // Log::info('Checked Transaction: ' . print_r($decodedData, true));

                return [
                    'reqUuid' => $refReqUuid,
                    'pay_item' => $decodedData,
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ];
            } else {
                //throw new \Exception($decodedResponse['resMesg']);
                return [
                    'reqUuid' => $refReqUuid,
                    'code' => (int)$decodedResponse['resCode'],
                    'message' => $decodedResponse['resMesg']
                ];
            }
        } catch (\Exception $e) {
            // Log the exception message
            Log::error('Check transaction failed: ' . $e->getMessage());

            // Optionally rethrow the exception or handle it
            throw $e;
        }
    }
}