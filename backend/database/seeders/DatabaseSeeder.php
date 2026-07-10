<?php

namespace Database\Seeders;

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use App\Models\SensorReading;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@stagebali.test'],
            [
                'name' => 'System Admin',
                'password' => 'password',
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        $technician = User::query()->firstOrCreate(
            ['email' => 'tech@stagebali.test'],
            [
                'name' => 'Maintenance Tech',
                'password' => 'password',
                'role' => 'technician',
                'email_verified_at' => now(),
            ],
        );

        $airConditioningFacility = Facility::query()->firstOrCreate(
            ['name' => 'Air Conditioning System'],
            [
                'type' => 'air_conditioning',
                'description' => 'Automated air conditioning facility used to control temperature, humidity, comfort, and energy usage inside the main community building.',
                'location' => 'Community Building',
                'status' => 'active',
            ],
        );

        $waterFacility = Facility::query()->firstOrCreate(
            ['name' => 'Water System'],
            [
                'type' => 'water_system',
                'description' => 'Automated water distribution facility used to monitor flow, pressure, tank level, and water quality across the village network.',
                'location' => 'Village Utility Zone',
                'status' => 'active',
            ],
        );

        $toolDefinitions = [
            $waterFacility->id => [
                [
                    'name' => 'Pressure Sensor',
                    'type' => 'pressure_sensor',
                    'location' => 'Pump Station',
                    'normal_min' => 2.50,
                    'normal_max' => 4.50,
                    'unit' => 'bar',
                    'installed_months_ago' => 6,
                ],
                [
                    'name' => 'Flow Sensor',
                    'type' => 'flow_sensor',
                    'location' => 'Distribution Line',
                    'normal_min' => 80.00,
                    'normal_max' => 140.00,
                    'unit' => 'L/min',
                    'installed_months_ago' => 4,
                ],
                [
                    'name' => 'Water Level Sensor',
                    'type' => 'water_level_sensor',
                    'location' => 'Main Tank',
                    'normal_min' => 45.00,
                    'normal_max' => 95.00,
                    'unit' => '%',
                    'installed_months_ago' => 5,
                ],
                [
                    'name' => 'Smart Valve',
                    'type' => 'smart_valve',
                    'location' => 'Distribution Valve Chamber',
                    'normal_min' => 0.00,
                    'normal_max' => 100.00,
                    'unit' => '% open',
                    'installed_months_ago' => 3,
                ],
                [
                    'name' => 'Pump Controller',
                    'type' => 'pump_controller',
                    'location' => 'Pump Station Control Panel',
                    'normal_min' => 0.00,
                    'normal_max' => 100.00,
                    'unit' => '% load',
                    'installed_months_ago' => 3,
                ],
                [
                    'name' => 'pH Sensor',
                    'type' => 'ph_sensor',
                    'location' => 'Water Quality Chamber',
                    'normal_min' => 6.50,
                    'normal_max' => 8.50,
                    'unit' => 'pH',
                    'installed_months_ago' => 2,
                ],
                [
                    'name' => 'Turbidity Sensor',
                    'type' => 'turbidity_sensor',
                    'location' => 'Water Quality Chamber',
                    'normal_min' => 0.00,
                    'normal_max' => 5.00,
                    'unit' => 'NTU',
                    'installed_months_ago' => 2,
                ],
                [
                    'name' => 'Water Pollution Sensor',
                    'type' => 'water_pollution_sensor',
                    'location' => 'Water Quality Chamber',
                    'normal_min' => 0.00,
                    'normal_max' => 50.00,
                    'unit' => 'ppm',
                    'installed_months_ago' => 2,
                ],
            ],
            $airConditioningFacility->id => [
                [
                    'name' => 'Temperature Sensor',
                    'type' => 'temperature_sensor',
                    'location' => 'Conference Room',
                    'normal_min' => 21.00,
                    'normal_max' => 25.00,
                    'unit' => '°C',
                    'installed_months_ago' => 4,
                ],
                [
                    'name' => 'Humidity Sensor',
                    'type' => 'humidity_sensor',
                    'location' => 'Conference Room',
                    'normal_min' => 40.00,
                    'normal_max' => 60.00,
                    'unit' => '%',
                    'installed_months_ago' => 4,
                ],
                [
                    'name' => 'Energy Meter',
                    'type' => 'energy_meter',
                    'location' => 'Electrical Room',
                    'normal_min' => 0.00,
                    'normal_max' => 18.00,
                    'unit' => 'kWh',
                    'installed_months_ago' => 3,
                ],
                [
                    'name' => 'AC Controller',
                    'type' => 'ac_controller',
                    'location' => 'HVAC Control Cabinet',
                    'normal_min' => 18.00,
                    'normal_max' => 26.00,
                    'unit' => '°C setpoint',
                    'installed_months_ago' => 3,
                ],
                [
                    'name' => 'CO₂ Sensor',
                    'type' => 'co2_sensor',
                    'location' => 'Main Hall',
                    'normal_min' => 400.00,
                    'normal_max' => 1000.00,
                    'unit' => 'ppm',
                    'installed_months_ago' => 2,
                ],
                [
                    'name' => 'Air Pollution Sensor',
                    'type' => 'air_pollution_sensor',
                    'location' => 'Main Hall',
                    'normal_min' => 0.00,
                    'normal_max' => 50.00,
                    'unit' => 'AQI',
                    'installed_months_ago' => 2,
                ],
                [
                    'name' => 'PM2.5 / Dust Sensor',
                    'type' => 'pm25_dust_sensor',
                    'location' => 'Air Intake',
                    'normal_min' => 0.00,
                    'normal_max' => 15.00,
                    'unit' => 'µg/m³',
                    'installed_months_ago' => 2,
                ],
            ],
        ];

        $expectedToolNames = collect($toolDefinitions)
            ->flatten(1)
            ->pluck('name')
            ->all();

        AutomatedTool::query()
            ->whereIn('facility_id', [$airConditioningFacility->id, $waterFacility->id])
            ->whereNotIn('name', $expectedToolNames)
            ->delete();

        $tools = [];

        foreach ($toolDefinitions as $facilityId => $definitions) {
            foreach ($definitions as $definition) {
                $tools[$definition['type']] = AutomatedTool::query()->updateOrCreate(
                    ['facility_id' => $facilityId, 'name' => $definition['name']],
                    [
                        'type' => $definition['type'],
                        'location' => $definition['location'],
                        'normal_min' => $definition['normal_min'],
                        'normal_max' => $definition['normal_max'],
                        'unit' => $definition['unit'],
                        'status' => 'active',
                        'installation_date' => Carbon::now()
                            ->subMonths($definition['installed_months_ago'])
                            ->toDateString(),
                    ],
                );
            }
        }

        $sensorSnapshots = [
            [
                'tool_id' => $tools['temperature_sensor']->id,
                'recorded_at' => Carbon::now()->subMinutes(20)->startOfMinute(),
                'value' => 23.40,
                'unit' => '°C',
                'status' => 'normal',
            ],
            [
                'tool_id' => $tools['humidity_sensor']->id,
                'recorded_at' => Carbon::now()->subMinutes(18)->startOfMinute(),
                'value' => 67.00,
                'unit' => '%',
                'status' => 'warning',
            ],
            [
                'tool_id' => $tools['energy_meter']->id,
                'recorded_at' => Carbon::now()->subMinutes(12)->startOfMinute(),
                'value' => 21.80,
                'unit' => 'kWh',
                'status' => 'warning',
            ],
            [
                'tool_id' => $tools['pressure_sensor']->id,
                'recorded_at' => Carbon::now()->subMinutes(15)->startOfMinute(),
                'value' => 3.80,
                'unit' => 'bar',
                'status' => 'normal',
            ],
            [
                'tool_id' => $tools['pressure_sensor']->id,
                'recorded_at' => Carbon::now()->subMinutes(5)->startOfMinute(),
                'value' => 5.20,
                'unit' => 'bar',
                'status' => 'warning',
            ],
            [
                'tool_id' => $tools['flow_sensor']->id,
                'recorded_at' => Carbon::now()->subMinutes(3)->startOfMinute(),
                'value' => 115.00,
                'unit' => 'L/min',
                'status' => 'normal',
            ],
            [
                'tool_id' => $tools['water_level_sensor']->id,
                'recorded_at' => Carbon::now()->subMinutes(2)->startOfMinute(),
                'value' => 38.00,
                'unit' => '%',
                'status' => 'warning',
            ],
        ];

        foreach ($sensorSnapshots as $snapshot) {
            SensorReading::query()->updateOrCreate(
                [
                    'tool_id' => $snapshot['tool_id'],
                    'recorded_at' => $snapshot['recorded_at'],
                ],
                [
                    'value' => $snapshot['value'],
                    'unit' => $snapshot['unit'],
                    'status' => $snapshot['status'],
                ],
            );
        }

        $airAlert = Alert::query()->updateOrCreate(
            [
                'facility_id' => $airConditioningFacility->id,
                'tool_id' => $tools['humidity_sensor']->id,
                'alert_type' => 'humidity_high',
                'status' => 'open',
            ],
            [
                'triggered_at' => Carbon::now()->subMinutes(18)->startOfMinute(),
                'severity' => 'medium',
                'message' => 'Humidity level is above the configured comfort range.',
            ],
        );

        $waterAlert = Alert::query()->updateOrCreate(
            [
                'facility_id' => $waterFacility->id,
                'tool_id' => $tools['pressure_sensor']->id,
                'alert_type' => 'threshold_breach',
                'status' => 'open',
            ],
            [
                'triggered_at' => Carbon::now()->subMinutes(5)->startOfMinute(),
                'severity' => 'high',
                'message' => 'Pressure exceeded the configured maximum threshold.',
            ],
        );

        MaintenanceTask::query()->updateOrCreate(
            [
                'facility_id' => $airConditioningFacility->id,
                'tool_id' => $tools['humidity_sensor']->id,
                'title' => 'Inspect humidity control and air circulation',
            ],
            [
                'alert_id' => $airAlert->id,
                'description' => 'Check filter condition, inspect ventilation path, and verify thermostat settings.',
                'assigned_to_user_id' => $technician->id,
                'status' => 'pending',
            ],
        );

        MaintenanceTask::query()->updateOrCreate(
            [
                'facility_id' => $waterFacility->id,
                'tool_id' => $tools['pressure_sensor']->id,
                'title' => 'Inspect pump pressure regulation',
            ],
            [
                'alert_id' => $waterAlert->id,
                'description' => 'Check valve operation and recalibrate the pressure sensor if needed.',
                'assigned_to_user_id' => $technician->id,
                'status' => 'in_progress',
            ],
        );

        foreach ([
            ['email' => 'operator@stagebali.test', 'name' => 'Facility Operator', 'role' => 'manager'],
            ['email' => 'water.tech@stagebali.test', 'name' => 'Water Technician', 'role' => 'technician'],
            ['email' => 'air.tech@stagebali.test', 'name' => 'Air Conditioning Technician', 'role' => 'technician'],
        ] as $user) {
            User::query()->firstOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => 'password',
                    'role' => $user['role'],
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
