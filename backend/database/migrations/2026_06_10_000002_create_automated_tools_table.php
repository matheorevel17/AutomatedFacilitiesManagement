<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automated_tools', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->index();
            $table->string('location');
            $table->decimal('normal_min', 10, 2);
            $table->decimal('normal_max', 10, 2);
            $table->string('unit', 30);
            $table->string('status')->default('active')->index();
            $table->date('installation_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automated_tools');
    }
};
