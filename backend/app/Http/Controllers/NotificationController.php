<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Notification;

class NotificationController extends Controller
{
    public function index()
    {
        try
        {   
            $logged_in_user = Auth::user()->id;

            $notifications = Notification::where('user_id', $logged_in_user)
                                ->latest()
                                ->take(20)
                                ->get();
            
            return response()->json([
                'status_code' => 200,
                'message' => 'Successfully.',
                'data' => $notifications
            ]);
        } 
        catch(\Exception $e)
        {
            return response()->json([
                'status_code' => 400,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function countUnRead()
    {
        $logged_in_user = Auth::user()->id;

        $count = Notification::where('user_id', $logged_in_user)
                    ->whereNull('read_at')
                    ->count();

        return response()->json([
            'status_code' => 200,
            'count' => $count
        ]);
    }
}
