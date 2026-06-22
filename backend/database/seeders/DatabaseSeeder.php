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

        $temperatureSensor = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $airConditioningFacility->id, 'name' => 'Temperature Sensor AC-01'],
            [
                'type' => 'temperature_sensor',
                'location' => 'Conference Room',
                'normal_min' => 21.00,
                'normal_max' => 25.00,
                'unit' => '°C',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(4)->toDateString(),
            ],
        );

        $humiditySensor = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $airConditioningFacility->id, 'name' => 'Humidity Sensor AC-02'],
            [
                'type' => 'humidity_sensor',
                'location' => 'Conference Room',
                'normal_min' => 40.00,
                'normal_max' => 60.00,
                'unit' => '%',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(4)->toDateString(),
            ],
        );

        $energyMeter = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $airConditioningFacility->id, 'name' => 'Energy Meter AC-03'],
            [
                'type' => 'energy_meter',
                'location' => 'Electrical Room',
                'normal_min' => 0.00,
                'normal_max' => 18.00,
                'unit' => 'kWh',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(3)->toDateString(),
            ],
        );

        $pressureSensor = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $waterFacility->id, 'name' => 'Pressure Sensor WS-01'],
            [
                'type' => 'pressure_sensor',
                'location' => 'Pump Station',
                'normal_min' => 2.50,
                'normal_max' => 4.50,
                'unit' => 'bar',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(6)->toDateString(),
            ],
        );

        $flowMeter = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $waterFacility->id, 'name' => 'Flow Sensor WS-02'],
            [
                'type' => 'flow_sensor',
                'location' => 'Distribution Line',
                'normal_min' => 80.00,
                'normal_max' => 140.00,
                'unit' => 'L/min',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(4)->toDateString(),
            ],
        );

        $tankLevelSensor = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $waterFacility->id, 'name' => 'Tank Level Sensor WS-03'],
            [
                'type' => 'water_level_sensor',
                'location' => 'Main Tank',
                'normal_min' => 45.00,
                'normal_max' => 95.00,
                'unit' => '%',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(5)->toDateString(),
            ],
        );

        $sensorSnapshots = [
            [
                'tool_id' => $temperatureSensor->id,
                'recorded_at' => Carbon::now()->subMinutes(20)->startOfMinute(),
                'value' => 23.40,
                'unit' => '°C',
                'status' => 'normal',
            ],
            [
                'tool_id' => $humiditySensor->id,
                'recorded_at' => Carbon::now()->subMinutes(18)->startOfMinute(),
                'value' => 67.00,
                'unit' => '%',
                'status' => 'warning',
            ],
            [
                'tool_id' => $energyMeter->id,
                'recorded_at' => Carbon::now()->subMinutes(12)->startOfMinute(),
                'value' => 21.80,
                'unit' => 'kWh',
                'status' => 'warning',
            ],
            [
                'tool_id' => $pressureSensor->id,
                'recorded_at' => Carbon::now()->subMinutes(15)->startOfMinute(),
                'value' => 3.80,
                'unit' => 'bar',
                'status' => 'normal',
            ],
            [
                'tool_id' => $pressureSensor->id,
                'recorded_at' => Carbon::now()->subMinutes(5)->startOfMinute(),
                'value' => 5.20,
                'unit' => 'bar',
                'status' => 'warning',
            ],
            [
                'tool_id' => $flowMeter->id,
                'recorded_at' => Carbon::now()->subMinutes(3)->startOfMinute(),
                'value' => 115.00,
                'unit' => 'L/min',
                'status' => 'normal',
            ],
            [
                'tool_id' => $tankLevelSensor->id,
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
                'tool_id' => $humiditySensor->id,
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
                'tool_id' => $pressureSensor->id,
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
                'tool_id' => $humiditySensor->id,
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
                'tool_id' => $pressureSensor->id,
                'title' => 'Inspect pump pressure regulation',
            ],
            [
                'alert_id' => $waterAlert->id,
                'description' => 'Check valve operation and recalibrate the pressure sensor if needed.',
                'assigned_to_user_id' => $technician->id,
                'status' => 'in_progress',
            ],
        );

        if (User::query()->count() < 5) {
            User::factory(3)->create([
                'role' => 'technician',
            ]);
        }
    }
}
