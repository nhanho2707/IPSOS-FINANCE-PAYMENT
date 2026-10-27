<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
        ];
    }

    public function sendPasswordResetNotification($token)
    {
        $url = rtrim(config('app.frontend_url'), '/') . '/confirm-password?' . http_build_query([
            'token' => $token,
            'email' => $this->email,
        ]);

        $this->notify(new ResetPasswordNotification($url));
    }

    public function userDetails()
    {
        return $this->hasOne(UserDetail::class);
    }

    public function permissions()
    {
        return $this->belongsToMany(Project::class, 'project_permissions', 'project_id', 'user_id');
    }
}
