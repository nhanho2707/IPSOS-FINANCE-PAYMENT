<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use App\Http\Requests\ForgotPasswordRequest;

class ForgotPasswordController extends Controller
{
    public function sendResetLink(ForgotPasswordRequest $request)
    {
        $status = Password::sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            Log::info('Password reset link not sent', ['status' => $status]);
        }

        // Same response whether or not the email exists, so this endpoint cannot be used to discover accounts.
        return response()->json([
            'status_code' => 200,
            'message'     => 'If the email is registered, a password reset link has been sent.',
        ]);
    }
}
