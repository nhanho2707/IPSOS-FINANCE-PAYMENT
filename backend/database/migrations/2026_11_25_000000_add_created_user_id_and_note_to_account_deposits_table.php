<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_deposits', function (Blueprint $table) {
            // Deposits made before this migration keep no author: the history shows them as not recorded.
            $table->foreignId('created_user_id')->nullable()->after('amount')->constrained('users')->nullOnDelete();
            $table->string('note')->nullable()->after('created_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('account_deposits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_user_id');
            $table->dropColumn('note');
        });
    }
};
