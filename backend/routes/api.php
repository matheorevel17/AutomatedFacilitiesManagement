<?php

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

Route::get('/health', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'message' => 'Laravel API is reachable.',
    ]);
});

Route::middleware('web')->group(function (): void {
    Route::get('/csrf-token', function (Request $request) {
        return response()->json([
            'csrf_token' => $request->session()->token(),
        ]);
    });

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

        Route::get('/facilities', function () {
            $facilities = Facility::query()
                ->withCount([
                    'automatedTools as tools_count',
                    'alerts as open_alerts_count' => fn ($query) => $query->where('status', 'open'),
                    'maintenanceTasks as active_tasks_count' => fn ($query) => $query->whereIn('status', ['pending', 'in_progress']),
                ])
                ->with([
                    'automatedTools' => fn ($query) => $query
                        ->withCount([
                            'alerts as open_alerts_count' => fn ($alertQuery) => $alertQuery->where('status', 'open'),
                        ])
                        ->with([
                            'latestSensorReading',
                        ])
                        ->orderBy('id'),
                    'alerts' => fn ($query) => $query
                        ->latest('triggered_at')
                        ->limit(5),
                    'maintenanceTasks' => fn ($query) => $query
                        ->with(['assignedTo:id,name'])
                        ->latest('updated_at')
                        ->limit(5),
                ])
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'type',
                    'description',
                    'location',
                    'status',
                ]);

            return response()->json([
                'facilities' => $facilities,
            ]);
        });

        Route::post('/facilities', function (Request $request) {
            $data = $request->validate([
                'name' => ['required', 'string', 'max:255', 'unique:facilities,name'],
                'type' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'location' => ['required', 'string', 'max:255'],
                'status' => ['required', 'string', Rule::in(['active', 'warning', 'critical', 'inactive'])],
            ]);

            $facility = Facility::query()->create($data);

            return response()->json([
                'message' => 'Facility created successfully.',
                'facility' => $facility,
            ], 201);
        });

        Route::patch('/facilities/{facility}', function (Request $request, Facility $facility) {
            $data = $request->validate([
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('facilities', 'name')->ignore($facility->id),
                ],
                'type' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'location' => ['required', 'string', 'max:255'],
                'status' => ['required', 'string', Rule::in(['active', 'warning', 'critical', 'inactive'])],
            ]);

            $facility->update($data);

            return response()->json([
                'message' => 'Facility updated successfully.',
                'facility' => $facility,
            ]);
        });

        Route::delete('/facilities/{facility}', function (Facility $facility) {
            $facility->delete();

            return response()->json([
                'message' => 'Facility deleted successfully.',
            ]);
        });

        Route::get('/automated-tools', function () {
            $tools = AutomatedTool::query()
                ->with([
                    'facility:id,name,type,location',
                    'latestSensorReading',
                ])
                ->withCount([
                    'alerts as open_alerts_count' => fn ($query) => $query->where('status', 'open'),
                ])
                ->orderBy('facility_id')
                ->orderBy('id')
                ->get([
                    'id',
                    'facility_id',
                    'name',
                    'type',
                    'location',
                    'normal_min',
                    'normal_max',
                    'unit',
                    'status',
                    'installation_date',
                ]);

            return response()->json([
                'stats' => [
                    'total' => $tools->count(),
                    'active' => $tools->where('status', 'active')->count(),
                    'inactive' => $tools->where('status', 'inactive')->count(),
                    'maintenance' => $tools->where('status', 'maintenance')->count(),
                ],
                'facilities' => Facility::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'type', 'location', 'status']),
                'tools' => $tools,
            ]);
        });

        Route::post('/automated-tools', function (Request $request) {
            $data = $request->validate([
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', 'string', 'max:255'],
                'location' => ['required', 'string', 'max:255'],
                'normal_min' => ['required', 'numeric'],
                'normal_max' => ['required', 'numeric', 'gte:normal_min'],
                'unit' => ['required', 'string', 'max:30'],
                'status' => ['required', 'string', 'in:active,inactive,maintenance'],
                'installation_date' => ['nullable', 'date'],
            ]);

            $tool = AutomatedTool::query()->create($data);

            return response()->json([
                'message' => 'Automated tool created successfully.',
                'tool' => $tool->load('facility:id,name,type,location'),
            ], 201);
        });

        Route::patch('/automated-tools/{automatedTool}', function (Request $request, AutomatedTool $automatedTool) {
            $data = $request->validate([
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', 'string', 'max:255'],
                'location' => ['required', 'string', 'max:255'],
                'normal_min' => ['required', 'numeric'],
                'normal_max' => ['required', 'numeric', 'gte:normal_min'],
                'unit' => ['required', 'string', 'max:30'],
                'status' => ['required', 'string', 'in:active,inactive,maintenance'],
                'installation_date' => ['nullable', 'date'],
            ]);

            $automatedTool->update($data);

            return response()->json([
                'message' => 'Automated tool updated successfully.',
                'tool' => $automatedTool->load('facility:id,name,type,location'),
            ]);
        });

        Route::delete('/automated-tools/{automatedTool}', function (AutomatedTool $automatedTool) {
            $automatedTool->delete();

            return response()->json([
                'message' => 'Automated tool deleted successfully.',
            ]);
        });

        Route::get('/alerts', function () {
            $alerts = Alert::query()
                ->with([
                    'facility:id,name,type,location',
                    'tool:id,name,type,location',
                ])
                ->latest('triggered_at')
                ->get([
                    'id',
                    'facility_id',
                    'tool_id',
                    'triggered_at',
                    'alert_type',
                    'severity',
                    'message',
                    'status',
                ]);

            return response()->json([
                'stats' => [
                    'total' => $alerts->count(),
                    'open' => $alerts->where('status', 'open')->count(),
                    'high_severity' => $alerts->where('severity', 'high')->count(),
                    'facilities_affected' => $alerts->pluck('facility_id')->unique()->count(),
                ],
                'alerts' => $alerts->values(),
            ]);
        });

        Route::get('/maintenance-tasks', function () {
            $tasks = MaintenanceTask::query()
                ->with([
                    'assignedTo:id,name',
                    'facility:id,name,type,location',
                    'tool:id,name,type,location',
                    'alert:id,alert_type,severity,status',
                ])
                ->latest('updated_at')
                ->get([
                    'id',
                    'alert_id',
                    'facility_id',
                    'tool_id',
                    'assigned_to_user_id',
                    'title',
                    'description',
                    'status',
                    'created_at',
                    'resolved_at',
                    'updated_at',
                ]);

            return response()->json([
                'stats' => [
                    'total' => $tasks->count(),
                    'pending' => $tasks->where('status', 'pending')->count(),
                    'in_progress' => $tasks->where('status', 'in_progress')->count(),
                    'resolved' => $tasks->where('status', 'resolved')->count(),
                ],
                'tasks' => $tasks->values(),
            ]);
        });
    });
});
