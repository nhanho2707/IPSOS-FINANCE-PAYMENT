<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Exception;
use Illuminate\Support\Facades\Log;

class APICMCObject 
{
    private $envObject;
    private $header;
    private $brandName;

    public function __construct(){
        $this->envObject = new ENVObject();
        $this->brandName = "IPSOS";

        $this->header = [
            'Content-Type: application/json'
        ];



        Log::info('CMC Telecom Enviroment: ' . $this->envObject->cmcTelecomEnvironment);
    }

    public function send_sms($phone_number, $message)
    {   
        $url = $this->envObject->cmcTelecomUrl;

        $postData = [
            "brandName" => $this->brandName,
            "message" => $message,
            "phoneNumber" => $phone_number,
            "user" => $this->envObject->cmcTelecomInfo['USERNAME'],
            "pass" => $this->envObject->cmcTelecomInfo['PASSWORD'], 
            "messageId" => "111"
        ];

        $responseData = $this->post_request($url, $postData);

        Log::info('SMS Response: ' . $this->mask_for_log(json_encode($responseData)));

        return $responseData['data'];
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
            
            Log::info("Post Data: " . $this->mask_for_log($jsonData));

            // Set cURL options
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            $header = $this->header;

            Log::info('Headers: ' . implode(',', $header));
            
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

            Log::info("Header: " . $headerText);
            Log::info("Body: " . $this->mask_for_log($bodyData));

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

    /**
     * SMS bodies carry card PIN codes and the request carries the CMC password.
     */
    private function mask_for_log(string $json): string
    {
        return preg_replace('/"(message|pass)"\s*:\s*"(?:[^"\\\\]|\\\\.)*"/', '"$1":"***"', $json);
    }

    private function json_validator($data) { 
        if (!empty($data)) { 
            return is_string($data) &&  
              is_array(json_decode($data, true)) ? true : false; 
        } 
        return false; 
    }


}
