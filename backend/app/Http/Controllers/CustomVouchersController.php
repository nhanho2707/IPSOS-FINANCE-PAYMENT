<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\Writer\PngWriter;
use App\Models\CustomVoucher;
use App\Models\CustomVoucherToken;
use App\Models\CustomVoucherTokenLog;
use App\Models\Employee;

class CustomVouchersController extends Controller
{
    public function authenticateToken(Request $request)
    {
        $employeeId = $request->employee_id ?? null;
        $phoneNumber = $request->phone_number ?? null;
        $batchId = $request->batch_id ?? null;
        $link = $request->link ?? null;
        $data = $request->data ?? null;

        $employee = Employee::where('employee_id', $employeeId)->first();

        if(!$employee){
            return response()->json([
                'status_code' => 400,
                'error' => 'Interviewer ID không tồn tại. Vui lòng kiểm tra.'
            ]);
        }

        if(!$phoneNumber || !$batchId || !$link){
            return response()->json([
                'status_code' => 400,
                'error' => 'Phone Number, BatchId and Link should not be blank.'
            ]);
        }

        $existingPhoneNumber = CustomVoucherToken::where('phone_number', $phoneNumber)->exists();

        if($existingPhoneNumber){
            return response()->json([
                'status_code' => 403,
                'error' => 'Số điện thoại này đã tham gia khảo sát trước đó. Vui lòng kiểm tra.'
            ]);
        }

        if(!$data){
            return response()->json([
                'status_code' => 400,
                'error' => 'Dữ liệu truyền vào không hợp lệ.'
            ]);
        }

        if(is_string($data)){
            $data = json_decode($data, true);
        }

        if(!is_array($data)){
            return response()->json([
                'status_code' => 400,
                'error' => 'Dữ liệu truyền vào không hợp lệ.'
            ]);
        }

        $dataArr = [];

        foreach($data as $key => $value){
            $dataArr[] = $key . '=' . trim($value);
        }

        $dataBase64 = base64_encode(implode(';', $dataArr));

        $token = Str::random(64);

        try{
            $customVoucherToken = CustomVoucherToken::create([
                'employee_id' => $employee->id,
                'phone_number' => $phoneNumber,
                'token' => $token,
                'attempts' => 0,
                'expires_at' => now()->addHours(24),
                'batch_id' => $batchId,
                'link' => $link,
                'data_base64' => $dataBase64,
                'status' => 'active'
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error("Lỗi khi tạo CustomVoucherToken: " . $e->getMessage());
 
            if ($e->getCode() == 23000) {
                return response()->json([
                    'status_code' => 400,
                    'error' => 'Số điện thoại này đã tham gia khảo sát trước đó. Vui lòng kiểm tra.'
                ]);
            } else {
                return response()->json([
                    'status_code' => 400,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $query = http_build_query([
            'id' => $customVoucherToken->id,
            'I.User1' => $customVoucherToken->token,
            'I.User2' => $customVoucherToken->data_base64
        ]);
        
        $linkFinal = $link . '&' . $query;
        
        return response()->json([
            'status_code' => 200,
            'respondent_id' => $customVoucherToken->id,
            'link' => $linkFinal
        ]);
    }

    public function assignVoucher(Request $request)
    {
        try
        {
            $tokenStr = $request->token ?? null;

            if (!$tokenStr) {
                return response()->json([
                    'status_code' => 400,
                    'error' => 'Missing token'
                ]);
            }
            
            $token = CustomVoucherToken::where('token', $tokenStr)
                        ->first();

            if(!$token){
                return response()->json([
                    'status_code' => 400,
                    'error' => 'Invalid token'
                ]);
            }

            if($token->status !== 'active'){
                return response()->json([
                    'status_code' => 400,
                    'error' => 'Token is blocked'
                ]);
            }

            if($token->expires_at && $token->expires_at < now()){
                return response()->json([
                    'status_code' => 400,
                    'error' => 'Token expired'
                ]);
            }

            $voucher = DB::transaction(function() use ($token) {
                // Locking the token makes a second request for it wait and then find the voucher the first one
                // assigned; locking the voucher row stops two tokens from taking the same voucher.
                $token = CustomVoucherToken::whereKey($token->id)->lockForUpdate()->first();

                $existing = CustomVoucher::where('token_id', $token->id)->first();

                if($existing){
                    return $existing;
                }

                $voucher = CustomVoucher::whereNull('token_id')
                                    ->where('batch_id', $token->batch_id)
                                    ->where('status', 'unused')
                                    ->where(function($q) {
                                        $q->whereNull('expired_to')
                                            ->orWhere('expired_to', '>=', now());
                                    })
                                    ->lockForUpdate()
                                    ->first();

                if(!$voucher){
                    return null;
                }

                if(!$voucher->uuid){
                    $voucher->uuid = Str::uuid();
                }

                $voucher->update([
                    'status' => 'used',
                    'token_id' => $token->id,
                    'sent_at' => now()
                ]);

                $token->increment('attempts');

                if($token->attempts >= 5){
                    $token->update([
                        'status' => 'blocked'
                    ]);
                }

                return $voucher;
            });

            if(!$voucher){
                return response()->json([
                    'status_code' => 400,
                    'error' => 'Out of vouchers'
                ]);
            }

            return $this->buildVoucherResponse($voucher);

        } catch(\Exception $e){
            Log::error($e);

            return response()->json([
                'status_code' => 500,
                'error' => 'Server error - ' . $e->getMessage()
            ]);
        }
    }

    private function buildVoucherResponse($voucher)
    {
        $qr = Builder::create()
            ->writer(new PngWriter())
            ->data($voucher->code)        // nội dung QR
            ->encoding(new Encoding('UTF-8'))
            ->size(300)                   // kích thước
            ->margin(10)
            ->build();

        // chuyển sang base64
        $qrBase64 = base64_encode($qr->getString());
        
        return response()->json([
            'status_code' => 200,
            'uuid' => $voucher->uuid,
            'qr' => $qrBase64,
            'expired_from' => $voucher->expired_from,
            'expired_to' => $voucher->expired_to
        ]);
    }

    public function searchLink(Request $request)
    {
         DB::beginTransaction();

        try{
            $employeeId = $request->employee_id ?? null;
            $phoneNumber = $request->phone_number ?? null;

            if(!$employeeId || !$phoneNumber){
                throw new \Exception("Mã số PVV và Số điện thoại đáp viên không được trống.");
            }
            
            $employee = Employee::where('employee_id', strtoupper($employeeId))->first();

            if(!$employee){
                throw new \Exception("Mã số PVV không tồn tại.");
            }

            $customVoucherToken = CustomVoucherToken::where('employee_id', $employee->id)
                                        ->where('phone_number', $phoneNumber)
                                        ->first();

            if(!$customVoucherToken){
                throw new \Exception('Không tìm thấy thông tin.');
            }

            if ($customVoucherToken->status === 'blocked') {
                throw new \Exception('Link đã bị khoá trước đó.');
            }

            $existingCustomVoucher = CustomVoucher::where('token_id', $customVoucherToken->id)->exists();

            if($existingCustomVoucher){
                throw new \Exception('Số điện thoại đã hoàn thành khảo sát.');
            }

            $customVoucherToken->increment('attempts');
            $customVoucherToken->refresh();

            if ($customVoucherToken->attempts > 3) {
                $customVoucherToken->status = 'blocked';
                $customVoucherToken->save();

                throw new \Exception('Bạn đã search thông tin quá 3 lần. Link phỏng vấn đã bị khoá.');
            }

            $query = http_build_query([
                'id' => $customVoucherToken->id,
                'I.User1' => $customVoucherToken->token,
                'I.User2' => $customVoucherToken->data_base64
            ]);

            $linkFinal = $customVoucherToken->link . '&' . $query;

            $qr = Builder::create()
                ->writer(new PngWriter())
                ->data($linkFinal)        // nội dung QR
                ->encoding(new Encoding('UTF-8'))
                ->size(300)                   // kích thước
                ->margin(10)
                ->build();

            // chuyển sang base64
            $qrBase64 = base64_encode($qr->getString());

            CustomVoucherTokenLog::create([
                'token_id' => $customVoucherToken->id
            ]);

            DB::commit();

            return response()->json([
                'status_code' => 200,
                'qr' => $qrBase64
            ]);

        } catch(\Exception $e){
            DB::rollBack();

            return response()->json([
                'status_code' => 400,
                'error' => 'Server error - ' . $e->getMessage()
            ]);
        }
    }
}
