<?php

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

Route::get('/health', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'message' => 'Laravel API is reachable.',
    ]);
});

Route::middleware('web')->group(function (): void {
    Route::post('/login', function (Request $request) {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, true)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Authenticated successfully.',
            'user' => $request->user()?->only(['id', 'name', 'email', 'role']),
        ]);
    });

    Route::post('/logout', function (Request $request) {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    });

    Route::get('/me', function (Request $request) {
        $user = Auth::guard('web')->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    });

    Route::middleware('auth')->group(function (): void {
        Route::get('/dashboard', function () {
            return response()->json([
                'stats' => [
                    'facilities' => Facility::count(),
                    'tools' => AutomatedTool::count(),
                    'open_alerts' => Alert::where('status', 'open')->count(),
                    'active_tasks' => MaintenanceTask::whereIn('status', ['pending', 'in_progress'])->count(),
                ],
                'facilities' => Facility::query()
                    ->withCount([
                        'automatedTools as tools_count',
                        'alerts as open_alerts_count' => fn ($query) => $query->where('status', 'open'),
                    ])
                    ->latest('id')
                    ->get(['id', 'name', 'type', 'status', 'location']),
                'recent_alerts' => Alert::query()
                    ->with([
                        'facility:id,name',
                        'tool:id,name',
                    ])
                    ->latest('triggered_at')
                    ->limit(5)
                    ->get([
                        'id',
                        'facility_id',
                        'tool_id',
                        'triggered_at',
                        'alert_type',
                        'severity',
                        'message',
                        'status',
                    ]),
                'maintenance_tasks' => MaintenanceTask::query()
                    ->with([
                        'assignedTo:id,name',
                        'facility:id,name',
                        'tool:id,name',
                    ])
                    ->latest('updated_at')
                    ->limit(5)
                    ->get([
                        'id',
                        'facility_id',
                        'tool_id',
                        'assigned_to_user_id',
                        'title',
                        'status',
                        'updated_at',
                    ]),
            ]);
        });
    });
});
