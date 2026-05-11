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
        Schema::create('cati_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name'); // batch name
            $table->enum('status', ['active', 'blocked'])->default('active');
            $table->integer('total_records')->default(0);
            $table->foreignId('created_user_id')->constrained('users');
            $table->timestamps();

            $table->unique(['project_id', 'name']);
        });

        Schema::create('cati_respondents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('batch_id')->constrained('cati_batches')->onDelete('cascade');
            
            $table->string('respondent_id');
            
            $table->string('phone');
            $table->string('name')->nullable();
            $table->string('link')->nullable();
            $table->string('filter_1')->nullable();
            $table->string('filter_2')->nullable();
            $table->string('filter_3')->nullable();
            $table->string('filter_4')->nullable();
            $table->string('status')->default('New'); // New, Calling, Done...
            $table->text('comment')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'assigned_to']);
            $table->index(['batch_id', 'status']);
            $table->index('phone');

            $table->unique(['project_id', 'respondent_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cati_batches');
        Schema::dropIfExists('cati_respondents');
    }
};
