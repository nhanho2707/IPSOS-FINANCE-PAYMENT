<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Model;
use Ramsey\Uuid\Uuid;
use App\Services\ENVObject;
use App\Models\ProjectGotItVoucherTransaction;
use App\Exceptions\GotItVoucherException;

class APIObject
{
    private $envObject;
    private $header;
    private $transactionRefId;
    private $signatureData;
    private $signature;
    
    public function __construct(){
        $this->envObject = new ENVObject();
        
        $this->header = [
            'X-GI-Authorization: ' . $this->envObject->gotitInfo['API_KEY'],
            'Content-Type: application/json'
        ];

        Log::info('Gotit Enviroment: ' . $this->envObject->gotitEnvironment);
    }

    public function setTransactionRefId(){

        // Log::info('Starting for generating signature');
        $uuid = $this->generate_formated_uuid();

        $this->transactionRefId = $this->envObject->gotitInfo['TRANSACTIONREFID_PREFIX'] ."_". $uuid;

        // Log::info('Transaction RefId: ' . $this->transactionRefId);
    }

    public function setSignatureData($signature_type, $order_name, $expiry_date){

        if($signature_type === 'SMS'){

            $this->signatureData = $this->envObject->gotitInfo['API_KEY'] . '|||';
        } else if($signature_type === 'CHECK_REFID'){

            $this->signatureData = $this->envObject->gotitInfo['API_KEY'] . '|' . $this->transactionRefId;
        } else if($signature_type === 'VOUCHER E') {
            
            $this->signatureData = $this->envObject->gotitInfo['API_KEY'] . '|' . $this->transactionRefId;
        } else if($signature_type === 'VOUCHER V') {

            $this->signatureData = $this->envObject->gotitInfo['API_KEY'] . '|' . $order_name . '|' . $expiry_date . '|' . $this->transactionRefId;
        } else if ($signature_type === 'VOUCHER G') {

            $this->signatureData = $this->envObject->gotitInfo['API_KEY'] . '|' . $order_name . '|' . $expiry_date . '|' . $this->transactionRefId;
        } else {    

            throw new Exception('Signature is incorrect.');
        }
        
        Log::info('Signature: ' . $this->signatureData);
    }

    public function getTransactionRefId(){

        return $this->transactionRefId;
    }

    public function get_categories(){

        $url = $this->envObject->gotitUrl . '/categories';

        $responseData = $this->get_request($url);

        return $responseData;
    }

    public function check_transaction($refid){
        
        // $this->setTransactionRefId();
        $this->signatureData = $this->envObject->gotitInfo['API_KEY'] . '|' . $refid;

        $signature = $this->generate_signature();

        $url = $this->envObject->gotitUrl . '/vouchers/multiple/status/' . $refid;

        Log::info('URL Request: ' . $url);

        $dataRequest = [
            "signature" => $signature
        ];

        $responseData = $this->get_request_with_body($url, $dataRequest);

        return $responseData;
    }

    public function get_vouchers($voucher_link_type, $postData)
    {
        $url = $this->envObject->gotitUrl . '/vouchers/' . $voucher_link_type;

        // Log::info('URL: ' . $url);

        $responseData = $this->post_request($url, $postData);
        
        if($responseData['statusCode'] !== 200){

            throw new \Exception('Lỗi từ phía IPSOS. Chưa xác định được thông tin lỗi');
        }

        if(!empty($responseData['error']) || !empty($responseData['message']))
        {
            switch(intval($responseData['error']))
            {
                case 2:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_API_INCORRECT, '[GET VOUCHERS]', 400);
                case 1012:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_PRODUCT_NOT_ALLOWED, '[GET VOUCHERS]', 401);
                case 2014:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_PRODUCT_NOT_ALLOWED, '[GET VOUCHERS]', 401);
                case 2015:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_MIN_VOUCHER_E_VALUE, '[GET VOUCHERS]', 402);
                case 2008:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_TRANSACTION_ALREADY_EXISTS, '[GET VOUCHERS]', 403);
                case 3003:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_SIGNATURE_INCORRECT, '[GET VOUCHERS]', 404);
                case 3004:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_ORDER_LIMIT_EXCEEDED, '[GET VOUCHERS]', 405);
                case 4006: 
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_OPT_INCORRECT, '[GET VOUCHERS]', 400);
                case 5006:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_QUANTITY_INCORRECT, '[GET VOUCHERS]', 400);
                default:
                    throw new GotItVoucherException('Lỗi chưa xác định.', 498);
            }
        }
        
        $responseVouchersData = $responseData['data'];

        if(in_array($voucher_link_type, ['e', 'v'])){

            foreach($responseVouchersData['vouchers'] as $index => &$voucher){

                if($voucher_link_type === 'e')
                {
                    $decryptedVoucherLink = $this->decrypt_data($voucher['voucher_link']);
                    $voucher['voucher_link'] = $decryptedVoucherLink;
                }

                if($voucher_link_type === 'v')
                {
                    $decryptedVoucherCode = $this->decrypt_data($voucher['voucherCode']);
                    $voucher['voucherCode'] = $decryptedVoucherCode;

                    Log::info('Voucher code: ' . $voucher['voucherCode']);

                    $decryptedVoucherLink = $this->decrypt_data($voucher['voucherLink']);
                    $voucher['voucherLink'] = $decryptedVoucherLink;

                    $decryptedVoucherLinkCode = $this->decrypt_data($voucher['voucherLinkCode']);
                    $voucher['voucherLinkCode'] = $decryptedVoucherLinkCode;
                }  
            }
        } else {
            $decryptedVoucherLinkGroup = $this->decrypt_data($responseVouchersData['groupVouchers']['voucherLink']);
            $responseVouchersData['groupVouchers']['voucherLink'] = $decryptedVoucherLinkGroup;

            $decryptedVoucherLinkCodeGroup = $this->decrypt_data($responseVouchersData['groupVouchers']['voucherLinkCode']);
            $responseVouchersData['groupVouchers']['voucherLinkCode'] = $decryptedVoucherLinkCodeGroup;
            
            foreach($responseVouchersData['vouchers'] as $index => &$voucher){

                $decryptedLink = $this->decrypt_data($voucher['link']);
                $voucher['link'] = $decryptedLink;

                $decryptedLink = $this->decrypt_data($voucher['code']);
                $voucher['code'] = $decryptedLink;
            }
        }
        
        return $responseVouchersData;
    }

    public function send_sms($postData)
    {
        $url = $this->envObject->gotitUrl . '/vouchers/send/sms';

        $responseData = $this->post_request($url, $postData);

        Log::info('SMS Response: ' . json_encode($responseData));

        if($responseData['statusCode'] !== 200){

            throw new \Exception('Lỗi từ phía IPSOS. Chưa xác định được thông tin lỗi');
        }

        if(!empty($responseData['error']) || !empty($responseData['message']))
        {
            switch(intval($responseData['error']))
            {
                case 2:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_API_INCORRECT, '[SEND SMS]', 400);
                case 1012:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_PRODUCT_NOT_ALLOWED, '[SEND SMS]', 401);
                case 2014:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_PRODUCT_NOT_ALLOWED, '[SEND SMS]', 401);
                case 2015:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_MIN_VOUCHER_E_VALUE, '[SEND SMS]', 402);
                case 2008:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_TRANSACTION_ALREADY_EXISTS, '[SEND SMS]', 403);
                case 3003:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_SIGNATURE_INCORRECT, '[SEND SMS]', 404);
                case 3004:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_ORDER_LIMIT_EXCEEDED, '[GET VOUCHERS]', 405);
                case 4006: 
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_OPT_INCORRECT, '[GET VOUCHERS]', 400);
                case 5006:
                    throw new GotItVoucherException(ProjectGotItVoucherTransaction::STATUS_QUANTITY_INCORRECT, '[GET VOUCHERS]', 400);
                default:
                    throw new GotItVoucherException('Lỗi chưa xác định.', 498);
            }
        }
        
        return $responseData['data'];
    }   

    private function get_request($url)
    {
        try {
            // Initialize cURL session
            $ch = curl_init($url);
            
            Log::info("URL: " . $url);

            // Set cURL options
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            // Without these cURL waits forever and PHP's time limit kills the request with no error recorded.
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $this->header); // Set headers if any

            // Execute cURL session and get the response
            $response = curl_exec($ch);

            // Check if any error occurred
            if (curl_errno($ch)) {
                Log::error('Request Error: ' . curl_error($ch));
                throw new \Exception('Request Error: ' . curl_error($ch));
            }
            
            // Get HTTP status code
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            
            // Close cURL session
            curl_close($ch);

            // Handle response
            if ($httpCode == 200) {
                // Handle the response, e.g., parse JSON or plain text
                if($this->json_validator($response)){
                    $responseData = json_decode($response, true);
                } else {
                    $responseData = $response;
                }

                // Log::info('Response data: ' . $response);
                return $responseData;
            } else {
                throw new \Exception('Request failed with HTTP code ' . $httpCode);
            }
        } catch (Exception $e) {
            // Log the exception message
            Log::error('GET request failed: ' . $e->getMessage());

            // Optionally rethrow the exception or handle it
            throw $e;
        }
    }

    private function get_request_with_body($url, $body)
    {
        try {
            $ch = curl_init($url);

            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "GET"); // ép GET
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);

            // Gửi body JSON
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));

            // Header
            $header = $this->header = [
                'X-GI-Authorization: ' . $this->envObject->gotitInfo['API_KEY'],
                'Content-Type: application/json'
            ];
            
            curl_setopt($ch, CURLOPT_HTTPHEADER, $header);

            // --- LOG trước khi gửi ---
            Log::info('GotIt API Request URL: ' . $url);
            Log::info('GotIt API Request Body: ' . json_encode($body));
            Log::info('GotIt API Request Header: ' . json_encode($header));

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            curl_close($ch);

            if ($httpCode == 200) {
                return json_decode($response, true);
            }

            throw new \Exception("Request failed with HTTP code $httpCode");
        } catch (\Exception $e) {
            Log::error($e->getMessage());
            throw $e;
        }
    }


    private function post_request($url, $postData)
    {
        try 
        {
            // Initialize cURL session
            Log::info('URL: ' . $url);

            $ch = curl_init($url);
            
            // Convert post data to JSON format
            if(empty($postData)){
                $jsonData = json_encode(array());
            } else {
                $jsonData = json_encode($postData);
            }
            
            // Log::info("Post Data: ".$jsonData);

            // Set cURL options
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);

            $header = $this->header;

            // Log::info('Headers: ' . implode(',', $header));
            
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HEADER => true, // <-- Bắt buộc để nhận header
                CURLOPT_HTTPHEADER => $header,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $jsonData,
            ]);

            // Execute cURL session and get the response
            $response = curl_exec($ch);

            // Check if any error occurred
            if (curl_errno($ch)) {
                Log::error('Request Error: ' . curl_error($ch));
                throw new \Exception('Request Error: ' . curl_error($ch));
            }
            
            // Get HTTP status code
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

            // Tách phần header và body
            $headerText = substr($response, 0, $headerSize);
            $bodyData = substr($response, $headerSize);

            // Log::info("Header: " . $headerText);
            // Log::info("Body: " . $bodyData);

            // Parse header thành mảng
            $headers = [];
            foreach (explode("\r\n", trim($headerText)) as $line) {
                if (strpos($line, ':') !== false) {
                    list($key, $value) = explode(': ', $line, 2);
                    $headers[$key] = $value;
                }
            }

            // ✅ Lấy signature nếu có
            $gtsignature = $headers['gt-signature'] ?? null;

            if(!empty($gtsignature))
            {
                if($this->verify_signature($bodyData, $gtsignature)){
                    // Close cURL session
                    curl_close($ch);

                    // Handle response
                    if ($httpCode == 200) 
                    {
                        if($this->json_validator($bodyData)){
                            $responseData = json_decode($bodyData, true);
                        } else {
                            $responseData = $bodyData;
                        }
                        
                        return $responseData;
                    } else {
                        throw new \Exception('Request failed with HTTP code ' . $httpCode);
                    }
                } else {
                    throw new \Exception('Signature incorrect.');
                }
            } 
            else 
            {
                // Close cURL session
                curl_close($ch);

                // Handle response
                if ($httpCode == 200) 
                {
                    if($this->json_validator($bodyData)){
                        $responseData = json_decode($bodyData, true);
                    } else {
                        $responseData = $bodyData;
                    }
                    
                    return $responseData;
                } else {
                    throw new \Exception('Request failed with HTTP code ' . $httpCode);
                }
            }
        } catch (Exception $e) {
            // Log the exception message
            Log::error('POST request failed: ' . $e->getMessage());

            // Optionally rethrow the exception or handle it
            throw $e;
        }
    }

    private function json_validator($data) 
    { 
        if (!empty($data)) { 
            return is_string($data) &&  
              is_array(json_decode($data, true)) ? true : false; 
        } 
        return false; 
    } 

    private function generate_formated_uuid()
    {
        // Generate a UUID using Laravel's Str::uuid() method
        $uuid = Uuid::uuid4()->toString();
        return $uuid;
    }

    public function generate_signature()
    {
        try {
            // Log::info('Data to generate Signature: ' . $this->signatureData);
            
            // Load the public key from the file
            $privateKeyPath = storage_path('keys/gotit/' . $this->envObject->environment . '/private_key_pkcs1.pem');
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
            $success = openssl_sign($this->signatureData, $signature, $privateKeyId, OPENSSL_ALGO_SHA256);

            // Free the private key resource
            openssl_free_key($privateKeyId);

            if (!$success) {
                Log::error('Failed to sign data');
                throw new Exception('Failed to sign data');
            }

            // Encode the signature to base64
            $encodedSignature = base64_encode($signature);
            
            // Log::info('Encoded signature: '. $encodedSignature);

            return $encodedSignature;
        } catch (\Exception $e) {
            // Log the exception message
            Log::error('Signature generation failed: ' . $e->getMessage());
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
    private function verify_signature($responseData, $signature)
    {
        try {
            // Load the public key from the file
            $publicKey = file_get_contents(storage_path('keys/gotit/' . $this->envObject->environment . '/public_key_gotit.pem'));

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
            // Log::info('Data to verify: ' . $responseData);
            // Log::info('Signature to verify (base64): ' . $signature);
            // Log::info('Decoded signature (re-encoded for check): ' . base64_encode($decoded_signature));

            // Log::info('Signature binary length: ' . strlen($decoded_signature));
            
            // Verify the signature using SHA256 with RSA
            $verify = openssl_verify($responseData, $decoded_signature, $pubKeyId, OPENSSL_ALGO_SHA256);
            
            // Log::info('verify = ' . $verify);

            // Free the key resource
            openssl_free_key($pubKeyId);

            // Check if the verification process encountered an error
            if ($verify !== 1) {
                throw new \Exception('An error occurred during signature verification: ' . openssl_error_string());
            }
            
            // Return the verification result
            // Log::info('verify = 1');

            return $verify === 1;
        } catch(Exception $e) {
            // Log the exception message
            Log::error('Signature verification failed: ' . $e->getMessage());

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
            $privateKey = file_get_contents(storage_path('keys/gotit/' . $this->envObject->gotitEnvironment . '/private_key_pkcs1.pem'));

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
            $decodedData = $cleanData;
            
            if ($decodedData === null && json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Malformed JSON data: ' . json_last_error_msg());
                throw new Exception('Malformed JSON data: ' . json_last_error_msg());
            }
            
            // Log::info('Result data decryption: ' . $decodedData);
            
            return $decodedData;
        } catch (Exception $e){
            // Log the exception message
            Log::error('Data decryption failed: ' . $e->getMessage());

            // Rethrow the exception to be handled by the calling code
            throw $e;
        }
    }
}
