<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use App\Http\Resources\UserResource;

class UserController extends Controller
{
    public function index(Request $request)
    {
        try
        {
            $perPage = $request->query('per_page', 10);
            $searchTerm = $request->query('searchTerm');

            $query = User::with('userDetails');

            if($searchTerm){
                $query->where(function($q) use ($searchTerm){
                    $q->where('email', 'LIKE', "%{$searchTerm}%");
                });
            }            

            $users = $query->paginate($perPage);

            return response()->json([
                'status_code' => 200,
                'message' => 'Successfully',
                'data' => UserResource::collection($users),
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                    'last_page' => $users->lastPage(),
                ]
            ]);
        } catch(\Exception $e)
        {
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try
        {
            $validated = $request->validate([
                'name' => "required|string|max:255",
                'email' => 'required|email|unique:users,email',
                'password' => 'required|min:6|confirmed',
                'role' => 'required|exists:roles,id',
                'department' => 'required|exists:departments,id',
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255'
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password'])
            ]);

            $user->userDetails()->create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'role_id' => $validated['role'],
                'department_id' => $validated['department'],
            ]);

            Password::sendResetLink([
                'email' => $user->email
            ]);

            DB::commit();

            Cache::forget('metadata_users');

            return response()->json([
                'status_code' => 200,
                'message' => 'User created successfully'
            ]);
        } catch(\Exception $e)
        {
            DB::rollBack();

            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage()
            ], 400);
        }
    }
}
