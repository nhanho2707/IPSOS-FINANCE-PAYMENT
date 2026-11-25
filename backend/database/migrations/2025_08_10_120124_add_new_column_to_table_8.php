<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The administrative divisions create migration declares these columns now, so a fresh database
     * already has them; only databases built before that change need them added.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('provinces', 'codename')) {
            Schema::table('provinces', function(Blueprint $table){
                $table->string('codename')->after('area_code');
                $table->string('short_codename')->after('codename');
            });
        }

        if (!Schema::hasColumn('districts', 'codename')) {
            Schema::table('districts', function(Blueprint $table){
                $table->string('codename')->after('population');
                $table->string('short_codename')->after('population');
            });
        }

        if (!Schema::hasColumn('wards', 'codename')) {
            Schema::table('wards', function(Blueprint $table){
                $table->string('codename')->after('population');
                $table->string('short_codename')->after('population');
            });
        }
    }

    /**
     * The columns belong to the create migration on fresh databases, so they are left in place.
     */
    public function down(): void
    {
    }
};
