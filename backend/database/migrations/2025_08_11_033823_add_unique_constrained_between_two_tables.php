<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The project respondents create migration declares this index now, so only databases built
     * before that change need it added.
     */
    public function up(): void
    {
        if (Schema::hasIndex('project_respondents', 'unique_project_resp_id')) {
            return;
        }

        Schema::table('project_respondents', function(Blueprint $table){
            $table->unique(['project_id', 'respondent_id'], 'unique_project_resp_id');
        });
    }

    /**
     * The index belongs to the create migration on fresh databases, so it is left in place.
     */
    public function down(): void
    {
    }
};
