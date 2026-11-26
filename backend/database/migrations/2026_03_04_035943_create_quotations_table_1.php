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
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->json('data');
            $table->integer('version');
            $table->enum('status', ['draft','submitted','approved','rejected'])->default('draft');
            $table->foreignId('created_user_id')->constrained('users');
            $table->foreignId('updated_user_id')->nullable()->constrained('users');
            $table->foreignId('submitted_user_id')->nullable()->contrained('users');
            $table->foreignId('approved_user_id')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        // operations is created by 2026_05_28_051542_create_operationns_table_2.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
