<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('silver_bullet_data', 'project_name')) {
            return;
        }

        Schema::table('silver_bullet_data', function (Blueprint $table) {
            $table->string('project_name')->nullable()->after('time_of_day');
            $table->index('project_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('silver_bullet_data', 'project_name')) {
            return;
        }

        Schema::table('silver_bullet_data', function (Blueprint $table) {
            $table->dropIndex(['project_name']);
            $table->dropColumn('project_name');
        });
    }
};
