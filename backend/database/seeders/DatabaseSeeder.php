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
        $admin = User::query()->firstOrCreate(
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

        $facility = Facility::query()->firstOrCreate(
            ['name' => 'Main Water Distribution System'],
            [
                'type' => 'water_system',
                'description' => 'Primary automated water facility for the main site.',
                'location' => 'Building A',
                'status' => 'active',
            ],
        );

        $pressureSensor = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $facility->id, 'name' => 'Pressure Sensor A1'],
            [
                'type' => 'pressure_sensor',
                'location' => 'Pump Room',
                'normal_min' => 2.50,
                'normal_max' => 4.50,
                'unit' => 'bar',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(6)->toDateString(),
            ],
        );

        $flowMeter = AutomatedTool::query()->firstOrCreate(
            ['facility_id' => $facility->id, 'name' => 'Flow Meter A2'],
            [
                'type' => 'flow_meter',
                'location' => 'Distribution Line',
                'normal_min' => 80.00,
                'normal_max' => 140.00,
                'unit' => 'L/min',
                'status' => 'active',
                'installation_date' => Carbon::now()->subMonths(4)->toDateString(),
            ],
        );

        $sensorSnapshots = [
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

        $alert = Alert::query()->updateOrCreate(
            [
                'facility_id' => $facility->id,
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
                'facility_id' => $facility->id,
                'tool_id' => $pressureSensor->id,
                'title' => 'Inspect pump pressure regulation',
            ],
            [
                'alert_id' => $alert->id,
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
