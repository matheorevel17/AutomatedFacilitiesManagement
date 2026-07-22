<?php

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use App\Models\SensorReading;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

if (! function_exists('classifyIncomingSensorReading')) {
    function classifyIncomingSensorReading(AutomatedTool $tool, float $value): string
    {
        $normalMin = (float) $tool->normal_min;
        $normalMax = (float) $tool->normal_max;
        $range = max($normalMax - $normalMin, 1);

        if ($value >= $normalMin && $value <= $normalMax) {
            return 'normal';
        }

        $distance = $value < $normalMin ? $normalMin - $value : $value - $normalMax;

        return $distance > ($range * 0.2) ? 'critical' : 'warning';
    }
}

if (! function_exists('storeIncomingSensorReading')) {
    function storeIncomingSensorReading(array $data): SensorReading
    {
        $tool = AutomatedTool::query()->findOrFail($data['tool_id']);

        if (isset($data['facility_id']) && (int) $data['facility_id'] !== (int) $tool->facility_id) {
            throw ValidationException::withMessages([
                'facility_id' => 'The selected tool must belong to the selected facility.',
            ]);
        }

        $unit = $data['unit'] ?? $tool->unit;

        if ($unit !== $tool->unit) {
            throw ValidationException::withMessages([
                'unit' => "The unit must match the selected tool unit ({$tool->unit}).",
            ]);
        }

        $value = round((float) $data['value'], 2);

        return SensorReading::query()->create([
            'tool_id' => $tool->id,
            'recorded_at' => $data['recorded_at'] ?? now(),
            'value' => $value,
            'unit' => $tool->unit,
            'status' => classifyIncomingSensorReading($tool, $value),
        ]);
    }
}

if (! function_exists('getToolReportingStatus')) {
    function getToolReportingStatus(?SensorReading $reading): array
    {
        if (! $reading) {
            return [
                'label' => 'no data',
                'level' => 'offline',
                'minutes_since_last_reading' => null,
            ];
        }

        $minutes = max(0, (int) round($reading->recorded_at->diffInMinutes(now(), false)));

        if ($minutes <= 10) {
            return [
                'label' => 'reporting',
                'level' => 'online',
                'minutes_since_last_reading' => $minutes,
            ];
        }

        if ($minutes <= 30) {
            return [
                'label' => 'delayed',
                'level' => 'delayed',
                'minutes_since_last_reading' => $minutes,
            ];
        }

        return [
            'label' => 'not reporting',
            'level' => 'offline',
            'minutes_since_last_reading' => $minutes,
        ];
    }
}

if (! function_exists('getToolRangeReference')) {
    function getToolRangeReference(string $type): string
    {
        return match ($type) {
            'pressure_sensor' => 'Prototype range for normal water distribution pressure. Low values can indicate a leak or pump issue; high values can indicate overpressure.',
            'flow_sensor' => 'Prototype range for normal water flow in the distribution line. Very low flow can indicate blockage; very high flow can indicate leak or abnormal consumption.',
            'water_level_sensor' => 'Prototype range for safe tank operation. Low level can indicate shortage or pump issue; very high level can indicate overflow risk.',
            'smart_valve' => 'Prototype range for valve opening feedback. Values outside 0-100% indicate invalid actuator feedback.',
            'pump_controller' => 'Prototype range for pump load feedback. Values outside 0-100% indicate invalid controller feedback or overload.',
            'ph_sensor' => 'Common water quality reference range for near-neutral water. Values outside the range can indicate quality issues.',
            'turbidity_sensor' => 'Prototype clean-water turbidity range. Higher values indicate suspended particles or dirty water.',
            'water_pollution_sensor' => 'Prototype pollution concentration threshold. Higher values indicate possible contamination.',
            'temperature_sensor' => 'Prototype indoor comfort range for air-conditioned rooms.',
            'humidity_sensor' => 'Common indoor comfort humidity range. High humidity can indicate poor cooling or ventilation issues.',
            'energy_meter' => 'Prototype energy consumption range per monitoring interval. Higher values can indicate inefficient cooling or abnormal usage.',
            'ac_controller' => 'Prototype AC setpoint range for normal comfort operation.',
            'co2_sensor' => 'Common indoor air quality reference range. High CO2 can indicate poor ventilation or occupancy issues.',
            'air_pollution_sensor' => 'Prototype air quality index range for acceptable indoor air conditions.',
            'pm25_dust_sensor' => 'Prototype PM2.5 concentration range for acceptable indoor air quality.',
            default => 'Prototype normal operating range used for simulation and defect detection. This can be adjusted after reviewing real facility specifications.',
        };
    }
}

Route::get('/health', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'message' => 'Laravel API is reachable.',
    ]);
});

Route::get('/cloud/simulator-options', function (Request $request) {
    $expectedToken = config('services.cloud_ingestion.token');

    if ($expectedToken && ! hash_equals($expectedToken, (string) $request->header('X-Cloud-Token'))) {
        return response()->json([
            'message' => 'Invalid cloud ingestion token.',
        ], 401);
    }

    if (! $expectedToken && app()->isProduction()) {
        return response()->json([
            'message' => 'Cloud ingestion token is not configured.',
        ], 503);
    }

    $tools = AutomatedTool::query()
        ->where('status', 'active')
        ->whereHas('facility', fn ($query) => $query->where('status', 'active'))
        ->orderBy('facility_id')
        ->orderBy('name')
        ->get([
            'id',
            'facility_id',
            'name',
            'type',
            'unit',
            'normal_min',
            'normal_max',
            'status',
        ]);

    $tools->each(fn (AutomatedTool $tool) => $tool->setAttribute(
        'normal_reference_note',
        getToolRangeReference($tool->type),
    ));

    return response()->json([
        'facilities' => Facility::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'location', 'status']),
        'tools' => $tools,
    ]);
});

Route::post('/cloud/sensor-readings', function (Request $request) {
    $expectedToken = config('services.cloud_ingestion.token');

    if ($expectedToken && ! hash_equals($expectedToken, (string) $request->header('X-Cloud-Token'))) {
        return response()->json([
            'message' => 'Invalid cloud ingestion token.',
        ], 401);
    }

    if (! $expectedToken && app()->isProduction()) {
        return response()->json([
            'message' => 'Cloud ingestion token is not configured.',
        ], 503);
    }

    $data = $request->has('readings')
        ? $request->validate([
            'readings' => ['required', 'array', 'min:1', 'max:500'],
            'readings.*.facility_id' => ['nullable', 'integer', 'exists:facilities,id'],
            'readings.*.tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
            'readings.*.recorded_at' => ['nullable', 'date'],
            'readings.*.value' => ['required', 'numeric'],
            'readings.*.unit' => ['nullable', 'string', 'max:30'],
        ])
        : ['readings' => [
            $request->validate([
                'facility_id' => ['nullable', 'integer', 'exists:facilities,id'],
                'tool_id' => ['required', 'integer', 'exists:automated_tools,id'],
                'recorded_at' => ['nullable', 'date'],
                'value' => ['required', 'numeric'],
                'unit' => ['nullable', 'string', 'max:30'],
            ]),
        ]];

    $readings = DB::transaction(
        fn () => collect($data['readings'])->map(fn (array $reading) => storeIncomingSensorReading($reading)),
    );

    return response()->json([
        'message' => 'Cloud sensor readings received successfully.',
        'summary' => [
            'received' => $readings->count(),
            'normal' => $readings->where('status', 'normal')->count(),
            'warning' => $readings->where('status', 'warning')->count(),
            'critical' => $readings->where('status', 'critical')->count(),
        ],
        'readings' => $readings->values(),
    ], 201);
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
            $tools = AutomatedTool::query()
                ->with('latestSensorReading')
                ->get(['id', 'name', 'status']);

            $tools->each(function (AutomatedTool $tool): void {
                $reporting = getToolReportingStatus($tool->latestSensorReading);

                $tool->setAttribute('reporting_status', $reporting['label']);
                $tool->setAttribute('reporting_level', $reporting['level']);
                $tool->setAttribute('minutes_since_last_reading', $reporting['minutes_since_last_reading']);
            });

            return response()->json([
                'stats' => [
                    'facilities' => Facility::count(),
                    'tools' => $tools->count(),
                    'open_alerts' => Alert::where('status', 'open')->count(),
                    'active_tasks' => MaintenanceTask::whereIn('status', ['pending', 'in_progress'])->count(),
                ],
                'tools_monitoring' => [
                    'reporting' => $tools->where('reporting_level', 'online')->count(),
                    'delayed' => $tools->where('reporting_level', 'delayed')->count(),
                    'not_reporting' => $tools->where('reporting_level', 'offline')->count(),
                    'recent' => $tools
                        ->sortByDesc(fn (AutomatedTool $tool) => $tool->latestSensorReading?->recorded_at)
                        ->take(5)
                        ->values(),
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
            $facility->update([
                'status' => 'inactive',
            ]);

            return response()->json([
                'message' => 'Facility marked inactive successfully.',
                'facility' => $facility,
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

            $tools->each(function (AutomatedTool $tool): void {
                $reporting = getToolReportingStatus($tool->latestSensorReading);

                $tool->setAttribute('reporting_status', $reporting['label']);
                $tool->setAttribute('reporting_level', $reporting['level']);
                $tool->setAttribute('minutes_since_last_reading', $reporting['minutes_since_last_reading']);
                $tool->setAttribute('normal_reference_note', getToolRangeReference($tool->type));
            });

            return response()->json([
                'stats' => [
                    'total' => $tools->count(),
                    'active' => $tools->where('status', 'active')->count(),
                    'inactive' => $tools->where('status', 'inactive')->count(),
                    'maintenance' => $tools->where('status', 'maintenance')->count(),
                    'reporting' => $tools->where('reporting_level', 'online')->count(),
                    'delayed' => $tools->where('reporting_level', 'delayed')->count(),
                    'not_reporting' => $tools->where('reporting_level', 'offline')->count(),
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
            $automatedTool->update([
                'status' => 'inactive',
            ]);

            return response()->json([
                'message' => 'Automated tool marked inactive successfully.',
                'tool' => $automatedTool->load('facility:id,name,type,location'),
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
            $alert->update([
                'status' => 'resolved',
            ]);

            return response()->json([
                'message' => 'Alert marked resolved successfully.',
                'alert' => $alert->load(['facility:id,name,type,location', 'tool:id,name,type,location']),
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
            $maintenanceTask->update([
                'status' => 'resolved',
                'resolved_at' => $maintenanceTask->resolved_at ?? now(),
            ]);

            return response()->json([
                'message' => 'Maintenance task marked resolved successfully.',
                'task' => $maintenanceTask->load(['assignedTo:id,name', 'facility:id,name,type,location', 'tool:id,name,type,location', 'alert:id,alert_type,severity,status']),
            ]);
        });
    });
});
