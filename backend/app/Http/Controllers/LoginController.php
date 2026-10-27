<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Providers\AppServiceProvider;
use App\Models\User;
use App\Http\Requests\LoginRequest;
use Symfony\Component\HttpFoundation\Response;
use App\Http\Resources\UserResource;

class LoginController extends Controller
{
    /**
     * Handle an authentication attempt.
     */
    public function login(Request $request)
    {
        // Validate the login request
        $request->validate([
            'email' => 'email|required',
            'password' => 'required'
        ]);
        
        // Attempt to authenticate the user
        $credentials = $request->only('email', 'password');
        
        if(!Auth::attempt($credentials)) 
        {
            // Return an error response if authentication fails
            return response()->json([
                'status_code' => Response::HTTP_UNAUTHORIZED, //401
                'message' => 'Invalid credentials',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Retrieve the authenticated user
        $user = Auth::user();
        
        // Optionally, you can check if the user is authenticated
        if (!$user) {
            return response()->json([
                'status_code' => Response::HTTP_UNAUTHORIZED, //401
                'message' => 'Unauthenticated',
            ]);
        }

        if (!Hash::check($request->password, $user->password, [])) {
            throw new \Exception('Error in Login 1');
        }

        if (!$user->is_active) {
            return response()->json([
                'status_code' => Response::HTTP_UNAUTHORIZED, //401
                'message' => 'Your account has been deactivated. Please contact an administrator.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        // Generate a token for the authenticated user
        $tokenResult = $user->createToken($user->name)->plainTextToken;
        
        //$user = User::where('email', $request->email)->first();
        
        // Specify the columns you want to return
        // $userData = [
        //     'id' => $user->id,
        //     'name' => $user->name,
        //     'email' => $user->email,
        // ];
        
        //Specify the columns you want to return
        //$userData = $user->only(['id', 'name', 'email']);

        return response()->json([
            'status_code' => Response::HTTP_OK, //200,
            'message' => 'Login successfully',
            'token' => $tokenResult,
            'user' => new UserResource($user)
        ], Response::HTTP_OK);
    }

    public function login_with_username_or_email(LoginRequest $request)
    {
        $loginType = filter_var($request->login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
        $credentials = [
            $loginType => $request->login,
            'password' => $request->password,
        ];

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            return response()->json(['message' => 'Login successful'], 200);
        }

        return response()->json(['message' => 'The provided credentials do not match our records.'], 422);
    }

    public function logout(Request $request)
    {
        //Revoke the token that used to authenticate the current request
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully'], 200);
    }
}
