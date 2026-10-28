<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Survey links with query strings are often longer than 255 characters.
     */
    public function up(): void
    {
        // On SQLite a column change rebuilds the table from its existing columns, so a missing
        // table produces "create table ... ()" and aborts the whole migrate run.
        if (!Schema::hasTable('cati_respondents')) {
            return;
        }

        Schema::table('cati_respondents', function (Blueprint $table) {
            $table->text('link')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('cati_respondents')) {
            return;
        }

        Schema::table('cati_respondents', function (Blueprint $table) {
            $table->string('link')->nullable()->change();
        });
    }
};
