<?php

namespace Tests\Feature;

use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\SensorReading;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CloudSensorIngestionTest extends TestCase
{
    use RefreshDatabase;

    public function test_external_simulator_can_send_single_sensor_reading_as_json(): void
    {
        config(['services.cloud_ingestion.token' => 'test-token']);
        $tool = $this->createTool();

        $response = $this
            ->withHeader('X-Cloud-Token', 'test-token')
            ->postJson('/api/cloud/sensor-readings', [
                'facility_id' => $tool->facility_id,
                'tool_id' => $tool->id,
                'recorded_at' => '2026-07-16T10:00:00Z',
                'value' => 3.2,
                'unit' => 'bar',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('summary.received', 1)
            ->assertJsonPath('summary.normal', 1)
            ->assertJsonPath('readings.0.status', 'normal');

        $this->assertDatabaseHas('sensor_data', [
            'tool_id' => $tool->id,
            'value' => 3.2,
            'unit' => 'bar',
            'status' => 'normal',
        ]);
    }

    public function test_external_simulator_can_send_sensor_reading_batch_as_json(): void
    {
        config(['services.cloud_ingestion.token' => 'test-token']);
        $tool = $this->createTool();

        $response = $this
            ->withHeader('X-Cloud-Token', 'test-token')
            ->postJson('/api/cloud/sensor-readings', [
                'readings' => [
                    [
                        'tool_id' => $tool->id,
                        'recorded_at' => '2026-07-16T10:00:00Z',
                        'value' => 3.2,
                        'unit' => 'bar',
                    ],
                    [
                        'tool_id' => $tool->id,
                        'recorded_at' => '2026-07-16T10:05:00Z',
                        'value' => 2.2,
                        'unit' => 'bar',
                    ],
                    [
                        'tool_id' => $tool->id,
                        'recorded_at' => '2026-07-16T10:10:00Z',
                        'value' => 1.5,
                        'unit' => 'bar',
                    ],
                ],
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('summary.received', 3)
            ->assertJsonPath('summary.normal', 1)
            ->assertJsonPath('summary.warning', 1)
            ->assertJsonPath('summary.critical', 1);

        $this->assertSame(3, SensorReading::query()->count());
    }

    public function test_cloud_ingestion_rejects_invalid_token(): void
    {
        config(['services.cloud_ingestion.token' => 'test-token']);
        $tool = $this->createTool();

        $this
            ->withHeader('X-Cloud-Token', 'wrong-token')
            ->postJson('/api/cloud/sensor-readings', [
                'tool_id' => $tool->id,
                'value' => 3.2,
                'unit' => 'bar',
            ])
            ->assertUnauthorized();

        $this->assertSame(0, SensorReading::query()->count());
    }

    public function test_cloud_ingestion_rejects_wrong_unit(): void
    {
        config(['services.cloud_ingestion.token' => 'test-token']);
        $tool = $this->createTool();

        $this
            ->withHeader('X-Cloud-Token', 'test-token')
            ->postJson('/api/cloud/sensor-readings', [
                'tool_id' => $tool->id,
                'value' => 3.2,
                'unit' => 'psi',
            ])
            ->assertUnprocessable();

        $this->assertSame(0, SensorReading::query()->count());
    }

    public function test_external_simulator_can_load_active_facilities_and_tools(): void
    {
        config(['services.cloud_ingestion.token' => 'test-token']);
        $tool = $this->createTool();

        $response = $this
            ->withHeader('X-Cloud-Token', 'test-token')
            ->getJson('/api/cloud/simulator-options');

        $response
            ->assertOk()
            ->assertJsonPath('facilities.0.id', $tool->facility_id)
            ->assertJsonPath('tools.0.id', $tool->id)
            ->assertJsonPath('tools.0.name', 'Pressure Sensor')
            ->assertJsonPath('tools.0.unit', 'bar');
    }

    private function createTool(): AutomatedTool
    {
        $facility = Facility::query()->create([
            'name' => 'Water System',
            'type' => 'water_system',
            'description' => 'Test facility',
            'location' => 'Test zone',
            'status' => 'active',
        ]);

        return AutomatedTool::query()->create([
            'facility_id' => $facility->id,
            'name' => 'Pressure Sensor',
            'type' => 'pressure_sensor',
            'location' => 'Pump station',
            'normal_min' => 2.50,
            'normal_max' => 4.50,
            'unit' => 'bar',
            'status' => 'active',
            'installation_date' => now()->toDateString(),
        ]);
    }
}
