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
        Schema::create('project_types', function(Blueprint $table){
            $table->id();
            $table->string('name')->unique();
            $table->string('title')->nullable();
            $table->timestamps();
        });
        
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code');
            $table->string('project_name');
            $table->boolean('disabled')->default(false);
            $table->timestamps();
        
            $table->unique(['internal_code', 'project_name'], 'unique_internal_code_project_name');
        });

        Schema::create('project_details', function (Blueprint $table) {
            $table->id(); //Auto-incrementing primary key.
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->string('symphony')->nullable(); //Symphony (External code for the project)
            $table->string('job_number')->nullable(); //job number code for the project
            $table->text('project_objectives')->nullable(); //objectives of the project
            $table->enum('status', ['planned', 'in coming', 'on going', 'completed', 'on hold', 'cancelled'])->default('planned'); //status of the project
            $table->foreignId('created_user_id')->constrained('users')->onDelete('cascade');
            $table->enum('platform', ['ifield', 'dimensions','other']); //platform the project run on
            $table->datetime('planned_field_start'); //start date of the project
            $table->datetime('planned_field_end'); //end date of the project
            $table->datetime('actual_field_start')->nullable(); //actual start date of the project
            $table->datetime('actual_field_end')->nullable(); //actual end date of the project
            $table->string('remember_token', 100);
            $table->string('remember_uuid');
            $table->timestamps();
        });

        Schema::create('project_general', function(Blueprint $table) {

            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->text('project_objectives');
            $table->string('type_of_quota_control')->nullable();
            $table->text('quota_description')->nullable();
            $table->text('service_line');
            
            $table->timestamps();
        });
        
        Schema::create('project_project_types', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('project_type_id')->constrained('project_types')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['project_id', 'project_type_id'], 'unique_project_project_types');
        });

        Schema::create('project_teams', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('team_id')->constrained('teams')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['project_id', 'team_id'], 'unique_project_teams');
        });

        Schema::create('project_provinces', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('province_id')->constrained('provinces')->onDelete('cascade');
            $table->integer('sample_size_main');
            $table->decimal('price_main', 15, 2);
            $table->decimal('price_main_1', 15, 2)->nullable();
            $table->decimal('price_main_2', 15, 2)->nullable();
            $table->decimal('price_main_3', 15, 2)->nullable();
            $table->decimal('price_main_4', 15, 2)->nullable();
            $table->decimal('price_main_5', 15, 2)->nullable();
            $table->integer('sample_size_boosters')->nullable();
            $table->decimal('price_boosters', 15, 2)->nullable();
            $table->decimal('price_boosters_1', 15, 2)->nullable();
            $table->decimal('price_boosters_2', 15, 2)->nullable();
            $table->decimal('price_boosters_3', 15, 2)->nullable();
            $table->decimal('price_boosters_4', 15, 2)->nullable();
            $table->decimal('price_boosters_5', 15, 2)->nullable();
            $table->integer('sample_size_non')->nullable();
            $table->decimal('price_non', 15, 2)->nullable();
            $table->decimal('price_non_1', 15, 2)->nullable();
            $table->decimal('price_non_2', 15, 2)->nullable();
            $table->decimal('price_non_3', 15, 2)->nullable();
            $table->decimal('price_non_4', 15, 2)->nullable();
            $table->decimal('price_non_5', 15, 2)->nullable();
            
            $table->timestamps();
            
            $table->unique(['project_id', 'province_id'], 'unique_project_province');
        });
        
        Schema::create('project_permissions', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['project_id', 'user_id'], 'unique_project_permissions');
        });

        Schema::create('project_employees', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['project_id', 'employee_id'], 'unique_project_employees');
        });

        Schema::create('project_clients', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('interview_methods', function(Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('project_interview_methods', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('interview_method_id')->constrained('interview_methods')->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('recruit_methods', function(Blueprint $table){
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('project_recruit_methods', function(Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('recruit_method_id')->constrained('recruit_methods')->onDelete('cascade');
            $table->timestamps();
        });

        // industries is created by 2026_06_02_032917_create_table_products_2 with its codes and names.

        Schema::create('target_audiences', function(Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('transportation_costs', function(Blueprint $table) {

            $table->id();
            $table->foreignId('origin_province_id')->constrained('provinces')->onDelete('cascade');
            $table->foreignId('destination_province_id')->constrained('provinces')->onDelete('cascade');
            $table->foreignId('destination_district_id')->constrained('districts')->onDelete('cascade');
            $table->decimal('distance_km', 8, 2)->nullable();
            $table->decimal('bike_cost_min', 15, 2)->nullable();
            $table->decimal('bike_cost_max', 15, 2)->nullable();
            $table->decimal('bus_cost_min', 15, 2)->nullable();
            $table->decimal('bus_cost_max', 15, 2)->nullable();
            $table->decimal('plane_cost_min', 15, 2)->nullable();
            $table->decimal('plane_cost_max', 15, 2)->nullable();
            $table->decimal('train_cost_min', 15, 2)->nullable();
            $table->decimal('train_cost_max', 15, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_types');
        Schema::dropIfExists('projects');   
        Schema::dropIfExists('project_details');
        Schema::dropIfExists('project_project_types');
        Schema::dropIfExists('project_provinces');
        Schema::dropIfExists('project_permissions');
        Schema::dropIfExists('project_employees');
    }
};
