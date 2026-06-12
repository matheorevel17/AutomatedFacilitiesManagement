<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensor_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tool_id')->constrained('automated_tools')->cascadeOnDelete();
            $table->dateTime('recorded_at')->index();
            $table->decimal('value', 10, 2);
            $table->string('unit', 30);
            $table->string('status')->default('normal')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sensor_data');
    }
};
