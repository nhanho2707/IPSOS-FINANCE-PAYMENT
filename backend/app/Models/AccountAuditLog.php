<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountAuditLog extends Model
{
    const UPDATED_AT = null;

    const ACTION_CREATED = 'created';
    const ACTION_UPDATED = 'updated';
    const ACTION_PASSWORD_RESET = 'password_reset';
    const ACTION_ACTIVATED = 'activated';
    const ACTION_DEACTIVATED = 'deactivated';

    protected $fillable = [
        'actor_id',
        'target_user_id',
        'action',
        'changes',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    public static function record(?User $actor, User $target, string $action, ?array $changes = null): self
    {
        return self::create([
            'actor_id' => $actor?->id,
            'target_user_id' => $target->id,
            'action' => $action,
            'changes' => $changes,
        ]);
    }
}
