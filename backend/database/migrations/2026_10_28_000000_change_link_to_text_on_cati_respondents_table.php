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
        Schema::table('cati_respondents', function (Blueprint $table) {
            $table->text('link')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cati_respondents', function (Blueprint $table) {
            $table->string('link')->nullable()->change();
        });
    }
};
