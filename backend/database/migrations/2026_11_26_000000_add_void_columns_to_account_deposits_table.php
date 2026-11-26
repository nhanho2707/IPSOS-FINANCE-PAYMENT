<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_deposits', function (Blueprint $table) {
            // A deposit entered by mistake is voided, never deleted: it stays in the history and drops out of the balance.
            $table->timestamp('voided_at')->nullable()->after('note');
            $table->foreignId('voided_by')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();
            $table->string('void_reason')->nullable()->after('voided_by');
        });
    }

    public function down(): void
    {
        Schema::table('account_deposits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voided_by');
            $table->dropColumn(['voided_at', 'void_reason']);
        });
    }
};
