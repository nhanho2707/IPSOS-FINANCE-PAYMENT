<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 50);
            $table->json('changes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_audit_logs');
    }
};
