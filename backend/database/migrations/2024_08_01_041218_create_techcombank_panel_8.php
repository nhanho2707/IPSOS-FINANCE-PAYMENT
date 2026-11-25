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
        Schema::create('techcombank_panel', function (Blueprint $table) {
            $table->id();
            //$table->string('external_id')->unique();
            $table->string('email')->unique();
            $table->string('phone_number')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('resource');
            $table->string('province_id')->constrained('provinces')->onDelete('cascade');
            $table->enum('gender', ['Nam','Nữ']);
            $table->integer('year_of_birth');
            $table->string('married')->nullable();
            $table->string('householdincome')->nullable();
            $table->string('occupation')->nullable();
            $table->string('education')->nullable();
            $table->string('I1')->nullable();
            $table->string('I2')->nullable();
            $table->string('D1')->nullable();
            $table->string('D2')->nullable();
            $table->string('S9')->nullable();
            $table->string('S10')->nullable();
            $table->string('Q4')->nullable();
            $table->string('AUM')->nullable();
            $table->string('TIER')->nullable();
            $table->string('Z1')->nullable();
            $table->date('recruitment_date');
            $table->string('recruitment_status');
            $table->string('status');
            $table->timestamps();

            //$table->unique(['external_id', 'email'], 'unique_external_id_email');
        });

        Schema::create('techcombank_channels', function(Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('chart_label')->nullable();
            $table->timestamps();
        });

        Schema::create('techcombank_channels_summarizes', function(Blueprint $table) {
            $table->id();
            $table->foreignId('panel_id')->constrained('techcombank_panel')->onDelete('cascade');
            $table->foreignId('bank_id')->constrained('banks')->onDelete('cascade');
            $table->foreignId('channel_id')->constrained('techcombank_channels')->onDelete('cascade');
            $table->boolean('value');
            $table->timestamps();

            $table->unique(['panel_id', 'bank_id', 'channel_id'], 'unique_channels_panel_bank');
        });

        Schema::create('techcombank_products', function(Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('chart_label')->nullable();
            $table->timestamps();
        });

        Schema::create('techcombank_products_summarizes', function(Blueprint $table) {
            $table->id();
            $table->foreignId('panel_id')->constrained('techcombank_panel')->onDelete('cascade');
            $table->foreignId('bank_id')->constrained('banks')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('techcombank_products')->onDelete('cascade');
            $table->boolean('value');
            $table->timestamps();

            $table->unique(['panel_id', 'bank_id', 'product_id'], 'unique_products_panel_bank');
        });

        Schema::create('techcombank_surveys', function(Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('engagment');
            $table->string('project_type');
            $table->integer('sent_out');
            $table->integer('respond');
            $table->double('respond_rate');
            $table->integer('completed_qualified');
            $table->integer('cancellation');
            $table->integer('number_of_question');
            $table->date('open_date');
            $table->date('close_date');
            $table->string('resource');
        });


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('techcombank_channels_summarizes');
        Schema::dropIfExists('techcombank_products_summarizes');
        Schema::dropIfExists('techcombank_channels');
        Schema::dropIfExists('techcombank_products');
        Schema::dropIfExists('techcombank_surveys');
        Schema::dropIfExists('techcombank_panel');
    }
};
