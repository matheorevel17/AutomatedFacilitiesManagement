<?php

use App\Models\Alert;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'message' => 'Laravel API is reachable.',
    ]);
});

Route::get('/dashboard', function () {
    return response()->json([
        'facilities' => Facility::count(),
        'open_alerts' => Alert::where('status', 'open')->count(),
        'active_tasks' => MaintenanceTask::whereIn('status', ['pending', 'in_progress'])->count(),
        'latest_facility' => Facility::query()
            ->latest('id')
            ->first(['id', 'name', 'type', 'status', 'location']),
    ]);
});
