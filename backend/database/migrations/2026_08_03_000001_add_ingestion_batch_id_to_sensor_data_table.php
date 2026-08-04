<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sensor_data', function (Blueprint $table) {
            $table->uuid('ingestion_batch_id')->nullable()->after('tool_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('sensor_data', function (Blueprint $table) {
            $table->dropIndex(['ingestion_batch_id']);
            $table->dropColumn('ingestion_batch_id');
        });
    }
};
