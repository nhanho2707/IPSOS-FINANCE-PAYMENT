<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;
use App\Models\AccountAuditLog;
use App\Http\Resources\UserResource;
use App\Http\Resources\AccountAuditLogResource;
use App\Http\Requests\UserIndexRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UpdateUserStatusRequest;
use App\Http\Requests\ResetUserPasswordRequest;
use App\Http\Requests\AuditLogIndexRequest;

class UserController extends Controller
{
    public function index(UserIndexRequest $request)
    {
        try
        {
            $validated = $request->validated();
            $perPage = $validated['per_page'] ?? 10;
            $searchTerm = $validated['searchTerm'] ?? null;

            $query = User::with(['userDetails.role', 'userDetails.department'])->latest('id');

            if($searchTerm){
                $query->where(function($q) use ($searchTerm){
                    $q->where('email', 'LIKE', "%{$searchTerm}%")
                        ->orWhere('name', 'LIKE', "%{$searchTerm}%")
                        ->orWhereHas('userDetails', function($d) use ($searchTerm){
                            $d->where('first_name', 'LIKE', "%{$searchTerm}%")
                                ->orWhere('last_name', 'LIKE', "%{$searchTerm}%");
                        });
                });
            }

            if(!empty($validated['role_id'])){
                $query->whereHas('userDetails', fn ($d) => $d->where('role_id', $validated['role_id']));
            }

            if(!empty($validated['department_id'])){
                $query->whereHas('userDetails', fn ($d) => $d->where('department_id', $validated['department_id']));
            }

            if(!empty($validated['status'])){
                $query->where('is_active', $validated['status'] === 'active');
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

    public function store(StoreUserRequest $request)
    {
        DB::beginTransaction();

        try
        {
            $validated = $request->validated();

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'must_change_password' => true,
            ]);

            $user->userDetails()->create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'role_id' => $validated['role'],
                'department_id' => $validated['department'],
            ]);

            AccountAuditLog::record($request->user(), $user, AccountAuditLog::ACTION_CREATED, [
                'email'      => $user->email,
                'role'       => Role::find($validated['role'])?->name,
                'department' => Department::find($validated['department'])?->name,
            ]);

            DB::commit();

            Cache::forget('metadata_users');

            return response()->json([
                'status_code' => 200,
                'message' => 'User created successfully',
                'data' => new UserResource($user->load('userDetails.role', 'userDetails.department')),
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

    public function update(UpdateUserRequest $request, $id)
    {
        try
        {
            $validated = $request->validated();

            $user = User::with('userDetails.role', 'userDetails.department')->findOrFail($id);
            $newRole = Role::findOrFail($validated['role']);

            if ($user->isAdmin() && strtolower($newRole->name) !== 'admin') {
                if ($user->id === $request->user()->id) {
                    return $this->refuse('You cannot remove the Admin role from your own account.');
                }

                if ($user->is_active && User::activeAdmins()->count() <= 1) {
                    return $this->refuse('Cannot remove the Admin role from the last active Admin.');
                }
            }

            $before = [
                'role'       => $user->userDetails?->role?->name,
                'department' => $user->userDetails?->department?->name,
            ];

            $user->userDetails()->update([
                'role_id'       => $validated['role'],
                'department_id' => $validated['department'],
            ]);

            $user = $user->fresh(['userDetails.role', 'userDetails.department']);

            $after = [
                'role'       => $user->userDetails?->role?->name,
                'department' => $user->userDetails?->department?->name,
            ];

            $changes = [];
            foreach ($after as $field => $value) {
                if ($before[$field] !== $value) {
                    $changes[$field] = ['from' => $before[$field], 'to' => $value];
                }
            }

            if ($changes) {
                AccountAuditLog::record($request->user(), $user, AccountAuditLog::ACTION_UPDATED, $changes);
            }

            return response()->json([
                'status_code' => 200,
                'message'     => 'User updated successfully',
                'data'        => new UserResource($user),
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

    public function updateStatus(UpdateUserStatusRequest $request, $id)
    {
        try
        {
            $isActive = $request->boolean('is_active');

            $user = User::with('userDetails.role', 'userDetails.department')->findOrFail($id);

            if (!$isActive) {
                if ($user->id === $request->user()->id) {
                    return $this->refuse('You cannot deactivate your own account.');
                }

                if ($user->is_active && $user->isAdmin() && User::activeAdmins()->count() <= 1) {
                    return $this->refuse('Cannot deactivate the last active Admin.');
                }
            }

            if ($user->is_active !== $isActive) {
                $user->is_active = $isActive;
                $user->save();

                if (!$isActive) {
                    $user->tokens()->delete();
                }

                AccountAuditLog::record(
                    $request->user(),
                    $user,
                    $isActive ? AccountAuditLog::ACTION_ACTIVATED : AccountAuditLog::ACTION_DEACTIVATED
                );

                Cache::forget('metadata_users');
            }

            return response()->json([
                'status_code' => 200,
                'message'     => $isActive ? 'User activated successfully' : 'User deactivated successfully',
                'data'        => new UserResource($user),
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

    public function resetPassword(ResetUserPasswordRequest $request, $id)
    {
        try
        {
            $validated = $request->validated();

            $user = User::findOrFail($id);

            $user->password = Hash::make($validated['password']);
            // Admin-set passwords are temporary: the user must choose their own on next login.
            $user->must_change_password = true;
            $user->save();

            $user->tokens()->delete();

            AccountAuditLog::record($request->user(), $user, AccountAuditLog::ACTION_PASSWORD_RESET);

            return response()->json([
                'status_code' => 200,
                'message'     => 'Password reset successfully',
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

    public function auditLogs(AuditLogIndexRequest $request, $id)
    {
        try
        {
            $user = User::findOrFail($id);

            $logs = $user->auditLogs()
                ->with('actor')
                ->latest('id')
                ->paginate($request->validated()['per_page'] ?? 10);

            return response()->json([
                'status_code' => 200,
                'message' => 'Successfully',
                'data' => AccountAuditLogResource::collection($logs),
                'meta' => [
                    'current_page' => $logs->currentPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'last_page' => $logs->lastPage(),
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

    public function setFirstPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|min:6|confirmed',
        ]);

        $user = $request->user();
        $user->password = Hash::make($request->password);
        $user->must_change_password = false;
        $user->save();

        return response()->json([
            'status_code' => 200,
            'message'     => 'Password set successfully',
        ]);
    }

    private function refuse(string $message)
    {
        return response()->json([
            'status_code' => 422,
            'message'     => $message,
        ], 422);
    }
}
