<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountDeposit extends Model
{
    protected $table = 'account_deposits';

    protected $fillable = [
        'account_type',
        'amount',
        'created_user_id',
        'note',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_user_id');
    }
}
