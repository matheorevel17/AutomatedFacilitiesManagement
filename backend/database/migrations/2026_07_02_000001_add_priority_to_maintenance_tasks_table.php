<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_tasks', function (Blueprint $table) {
            $table->string('priority')->default('medium')->index()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_tasks', function (Blueprint $table) {
            $table->dropColumn('priority');
        });
    }
};
