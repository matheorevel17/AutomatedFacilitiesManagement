<?php

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use App\Models\SensorReading;
use App\Models\User;
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
                    'high_severity' => $alerts->whereIn('severity', ['high', 'critical'])->count(),
                    'facilities_affected' => $alerts->pluck('facility_id')->unique()->count(),
                ],
                'facilities' => Facility::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'type', 'location', 'status']),
                'tools' => AutomatedTool::query()
                    ->orderBy('facility_id')
                    ->orderBy('id')
                    ->get(['id', 'facility_id', 'name', 'type', 'location', 'status']),
                'alerts' => $alerts->values(),
            ]);
        });

        Route::post('/alerts', function (Request $request) {
            $data = $request->validate([
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'triggered_at' => ['required', 'date'],
                'alert_type' => ['required', 'string', 'max:255'],
                'severity' => ['required', 'string', Rule::in(['low', 'medium', 'high', 'critical'])],
                'message' => ['required', 'string'],
                'status' => ['required', 'string', Rule::in(['open', 'in_progress', 'resolved'])],
            ]);

            $tool = AutomatedTool::query()->findOrFail($data['tool_id']);

            if ((int) $tool->facility_id !== (int) $data['facility_id']) {
                throw ValidationException::withMessages([
                    'tool_id' => 'The selected tool must belong to the selected facility.',
                ]);
            }

            $alert = Alert::query()->create($data);

            return response()->json([
                'message' => 'Alert created successfully.',
                'alert' => $alert->load(['facility:id,name,type,location', 'tool:id,name,type,location']),
            ], 201);
        });

        Route::patch('/alerts/{alert}', function (Request $request, Alert $alert) {
            $data = $request->validate([
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'triggered_at' => ['required', 'date'],
                'alert_type' => ['required', 'string', 'max:255'],
                'severity' => ['required', 'string', Rule::in(['low', 'medium', 'high', 'critical'])],
                'message' => ['required', 'string'],
                'status' => ['required', 'string', Rule::in(['open', 'in_progress', 'resolved'])],
            ]);

            $tool = AutomatedTool::query()->findOrFail($data['tool_id']);

            if ((int) $tool->facility_id !== (int) $data['facility_id']) {
                throw ValidationException::withMessages([
                    'tool_id' => 'The selected tool must belong to the selected facility.',
                ]);
            }

            $alert->update($data);

            return response()->json([
                'message' => 'Alert updated successfully.',
                'alert' => $alert->load(['facility:id,name,type,location', 'tool:id,name,type,location']),
            ]);
        });

        Route::patch('/alerts/{alert}/status', function (Request $request, Alert $alert) {
            $data = $request->validate([
                'status' => ['required', 'string', Rule::in(['open', 'in_progress', 'resolved'])],
            ]);

            $alert->update([
                'status' => $data['status'],
            ]);

            return response()->json([
                'message' => 'Alert status updated successfully.',
                'alert' => $alert->load(['facility:id,name,type,location', 'tool:id,name,type,location']),
            ]);
        });

        Route::delete('/alerts/{alert}', function (Alert $alert) {
            $alert->delete();

            return response()->json([
                'message' => 'Alert deleted successfully.',
            ]);
        });

        Route::get('/simulation', function () {
            $readings = SensorReading::query()
                ->with([
                    'tool:id,facility_id,name,type,unit',
                    'tool.facility:id,name,type,location',
                ])
                ->latest('recorded_at')
                ->limit(60)
                ->get([
                    'id',
                    'tool_id',
                    'recorded_at',
                    'value',
                    'unit',
                    'status',
                ]);

            return response()->json([
                'facilities' => Facility::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'type', 'location', 'status']),
                'tools' => AutomatedTool::query()
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
                    ]),
                'recent_readings' => $readings,
                'stats' => [
                    'readings' => SensorReading::query()->count(),
                    'normal' => SensorReading::query()->where('status', 'normal')->count(),
                    'warning' => SensorReading::query()->where('status', 'warning')->count(),
                    'critical' => SensorReading::query()->where('status', 'critical')->count(),
                ],
            ]);
        });

        Route::post('/simulation/generate', function (Request $request) {
            $data = $request->validate([
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'count' => ['required', 'integer', 'min:1', 'max:200'],
                'mean' => ['required', 'numeric'],
                'standard_deviation' => ['required', 'numeric', 'min:0'],
                'normal_min' => ['required', 'numeric'],
                'normal_max' => ['required', 'numeric', 'gte:normal_min'],
                'scenario' => ['required', 'string', Rule::in([
                    'normal_operation',
                    'possible_water_leak',
                    'low_water_level',
                    'water_pollution_detected',
                    'poor_cooling_performance',
                    'high_humidity_level',
                    'poor_air_quality',
                    'pollution_detected',
                    'abnormal_sensor_values',
                ])],
            ]);

            $tool = AutomatedTool::query()->findOrFail($data['tool_id']);

            if ((int) $tool->facility_id !== (int) $data['facility_id']) {
                throw ValidationException::withMessages([
                    'tool_id' => 'The selected tool must belong to the selected facility.',
                ]);
            }

            $standardDeviation = max((float) $data['standard_deviation'], 0.01);
            $normalMin = (float) $data['normal_min'];
            $normalMax = (float) $data['normal_max'];
            $range = max($normalMax - $normalMin, 1);
            $baseTime = now()->subMinutes((int) $data['count'] * 5);
            $readings = collect();

            SensorReading::query()
                ->where('tool_id', $tool->id)
                ->delete();

            for ($index = 0; $index < (int) $data['count']; $index++) {
                $mean = (float) $data['mean'];

                if (in_array($data['scenario'], ['possible_water_leak', 'low_water_level'], true) && $index > $data['count'] * 0.45) {
                    $mean = $normalMin - ($range * 0.25);
                }

                if (in_array($data['scenario'], [
                    'water_pollution_detected',
                    'poor_cooling_performance',
                    'high_humidity_level',
                    'poor_air_quality',
                    'pollution_detected',
                    'abnormal_sensor_values',
                ], true) && $index > $data['count'] * 0.45) {
                    $mean = $normalMax + ($range * 0.25);
                }

                $value = $mean + ($standardDeviation * sqrt(-2 * log(max(mt_rand() / mt_getrandmax(), 0.0001))) * cos(2 * pi() * mt_rand() / mt_getrandmax()));
                $value = round($value, 2);
                $status = 'normal';

                if ($value < $normalMin || $value > $normalMax) {
                    $distance = $value < $normalMin ? $normalMin - $value : $value - $normalMax;
                    $status = $distance > ($range * 0.2) ? 'critical' : 'warning';
                }

                $readings->push(SensorReading::query()->create([
                    'tool_id' => $tool->id,
                    'recorded_at' => $baseTime->copy()->addMinutes($index * 5),
                    'value' => $value,
                    'unit' => $tool->unit,
                    'status' => $status,
                ]));
            }

            return response()->json([
                'message' => 'Simulated data generated successfully.',
                'summary' => [
                    'generated' => $readings->count(),
                    'normal' => $readings->where('status', 'normal')->count(),
                    'warning' => $readings->where('status', 'warning')->count(),
                    'critical' => $readings->where('status', 'critical')->count(),
                ],
                'readings' => $readings->values(),
            ], 201);
        });

        Route::post('/simulation/detect', function (Request $request) {
            $data = $request->validate([
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'scenario' => ['required', 'string', Rule::in([
                    'normal_operation',
                    'possible_water_leak',
                    'low_water_level',
                    'water_pollution_detected',
                    'poor_cooling_performance',
                    'high_humidity_level',
                    'poor_air_quality',
                    'pollution_detected',
                    'abnormal_sensor_values',
                ])],
            ]);

            $tool = AutomatedTool::query()->with('facility:id,name')->findOrFail($data['tool_id']);

            if ((int) $tool->facility_id !== (int) $data['facility_id']) {
                throw ValidationException::withMessages([
                    'tool_id' => 'The selected tool must belong to the selected facility.',
                ]);
            }

            $readings = SensorReading::query()
                ->where('tool_id', $tool->id)
                ->latest('recorded_at')
                ->limit(30)
                ->get();

            $abnormalReadings = $readings->whereIn('status', ['warning', 'critical']);

            if ($abnormalReadings->isEmpty()) {
                return response()->json([
                    'message' => 'No defect detected in the latest sensor readings.',
                    'alert' => null,
                    'summary' => [
                        'checked' => $readings->count(),
                        'abnormal' => 0,
                        'critical' => 0,
                    ],
                ]);
            }

            $criticalCount = $abnormalReadings->where('status', 'critical')->count();
            $severity = $criticalCount > 0 ? 'high' : 'medium';
            $alertType = match ($data['scenario']) {
                'possible_water_leak' => 'possible_water_leak',
                'low_water_level' => 'low_water_level',
                'water_pollution_detected' => 'water_pollution_detected',
                'poor_cooling_performance' => 'poor_cooling_performance',
                'high_humidity_level' => 'high_humidity_level',
                'poor_air_quality' => 'poor_air_quality',
                'pollution_detected' => 'pollution_detected',
                default => 'abnormal_sensor_values',
            };

            $alert = Alert::query()->updateOrCreate(
                [
                    'facility_id' => $tool->facility_id,
                    'tool_id' => $tool->id,
                    'alert_type' => $alertType,
                    'status' => 'open',
                ],
                [
                    'triggered_at' => $abnormalReadings->sortByDesc('recorded_at')->first()->recorded_at,
                    'severity' => $severity,
                    'message' => "{$abnormalReadings->count()} abnormal readings detected for {$tool->name}.",
                ],
            );

            return response()->json([
                'message' => 'Defect detected and alert created.',
                'alert' => $alert->load(['facility:id,name,type,location', 'tool:id,name,type,location']),
                'summary' => [
                    'checked' => $readings->count(),
                    'abnormal' => $abnormalReadings->count(),
                    'critical' => $criticalCount,
                ],
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
                    'priority',
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
                'facilities' => Facility::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'type', 'location', 'status']),
                'tools' => AutomatedTool::query()
                    ->orderBy('facility_id')
                    ->orderBy('id')
                    ->get(['id', 'facility_id', 'name', 'type', 'location', 'status']),
                'alerts' => Alert::query()
                    ->latest('triggered_at')
                    ->get(['id', 'facility_id', 'tool_id', 'alert_type', 'severity', 'status']),
                'users' => User::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'email', 'role']),
                'tasks' => $tasks->values(),
            ]);
        });

        Route::post('/maintenance-tasks', function (Request $request) {
            $data = $request->validate([
                'alert_id' => ['nullable', 'integer', 'exists:alerts,id'],
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'title' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'assigned_to_user_id' => ['nullable', 'integer', 'exists:users,id'],
                'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'resolved'])],
                'priority' => ['required', 'string', Rule::in(['low', 'medium', 'high', 'critical'])],
            ]);

            $tool = AutomatedTool::query()->findOrFail($data['tool_id']);

            if ((int) $tool->facility_id !== (int) $data['facility_id']) {
                throw ValidationException::withMessages([
                    'tool_id' => 'The selected tool must belong to the selected facility.',
                ]);
            }

            if ($data['alert_id']) {
                $alert = Alert::query()->findOrFail($data['alert_id']);

                if ((int) $alert->facility_id !== (int) $data['facility_id']) {
                    throw ValidationException::withMessages([
                        'alert_id' => 'The selected alert must belong to the selected facility.',
                    ]);
                }
            }

            $data['resolved_at'] = $data['status'] === 'resolved' ? now() : null;

            $task = MaintenanceTask::query()->create($data);

            return response()->json([
                'message' => 'Maintenance task created successfully.',
                'task' => $task->load(['assignedTo:id,name', 'facility:id,name,type,location', 'tool:id,name,type,location', 'alert:id,alert_type,severity,status']),
            ], 201);
        });

        Route::patch('/maintenance-tasks/{maintenanceTask}', function (Request $request, MaintenanceTask $maintenanceTask) {
            $data = $request->validate([
                'alert_id' => ['nullable', 'integer', 'exists:alerts,id'],
                'facility_id' => ['required', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'title' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'assigned_to_user_id' => ['nullable', 'integer', 'exists:users,id'],
                'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'resolved'])],
                'priority' => ['required', 'string', Rule::in(['low', 'medium', 'high', 'critical'])],
            ]);

            $tool = AutomatedTool::query()->findOrFail($data['tool_id']);

            if ((int) $tool->facility_id !== (int) $data['facility_id']) {
                throw ValidationException::withMessages([
                    'tool_id' => 'The selected tool must belong to the selected facility.',
                ]);
            }

            if ($data['alert_id']) {
                $alert = Alert::query()->findOrFail($data['alert_id']);

                if ((int) $alert->facility_id !== (int) $data['facility_id']) {
                    throw ValidationException::withMessages([
                        'alert_id' => 'The selected alert must belong to the selected facility.',
                    ]);
                }
            }

            $data['resolved_at'] = $data['status'] === 'resolved'
                ? ($maintenanceTask->resolved_at ?? now())
                : null;

            $maintenanceTask->update($data);

            return response()->json([
                'message' => 'Maintenance task updated successfully.',
                'task' => $maintenanceTask->load(['assignedTo:id,name', 'facility:id,name,type,location', 'tool:id,name,type,location', 'alert:id,alert_type,severity,status']),
            ]);
        });

        Route::patch('/maintenance-tasks/{maintenanceTask}/status', function (Request $request, MaintenanceTask $maintenanceTask) {
            $data = $request->validate([
                'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'resolved'])],
            ]);

            $maintenanceTask->update([
                'status' => $data['status'],
                'resolved_at' => $data['status'] === 'resolved' ? now() : null,
            ]);

            return response()->json([
                'message' => 'Maintenance task status updated successfully.',
                'task' => $maintenanceTask->load(['assignedTo:id,name', 'facility:id,name,type,location', 'tool:id,name,type,location', 'alert:id,alert_type,severity,status']),
            ]);
        });

        Route::delete('/maintenance-tasks/{maintenanceTask}', function (MaintenanceTask $maintenanceTask) {
            $maintenanceTask->delete();

            return response()->json([
                'message' => 'Maintenance task deleted successfully.',
            ]);
        });
    });
});
