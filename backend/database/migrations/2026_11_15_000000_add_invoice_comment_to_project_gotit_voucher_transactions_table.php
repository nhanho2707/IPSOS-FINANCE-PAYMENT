<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The create migration declares this column, but databases built before it was added lack it,
     * and the transaction exports read it.
     */
    public function up(): void
    {
        if (Schema::hasColumn('project_gotit_voucher_transactions', 'invoice_comment')) {
            return;
        }

        Schema::table('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->string('invoice_comment')->nullable()->after('voucher_status');
        });
    }

    /**
     * Fresh databases get the column from the create migration, so it is left in place here.
     */
    public function down(): void
    {
    }
};
