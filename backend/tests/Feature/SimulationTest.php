<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\SensorReading;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_generate_sensor_data_and_detect_defect(): void
    {
        $user = User::factory()->create();
        $facility = Facility::query()->create([
            'name' => 'Water System',
            'type' => 'water_system',
            'description' => 'Test facility',
            'location' => 'Test zone',
            'status' => 'active',
        ]);
        $tool = AutomatedTool::query()->create([
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

        $generateResponse = $this
            ->actingAs($user)
            ->postJson('/api/simulation/generate', [
                'facility_id' => $facility->id,
                'tool_id' => $tool->id,
                'count' => 12,
                'mean' => 3.50,
                'standard_deviation' => 0.05,
                'normal_min' => 2.50,
                'normal_max' => 4.50,
                'scenario' => 'possible_water_leak',
            ]);

        $generateResponse
            ->assertCreated()
            ->assertJsonPath('summary.generated', 12);

        $this->assertSame(12, SensorReading::query()->count());

        $this
            ->actingAs($user)
            ->postJson('/api/simulation/generate', [
                'facility_id' => $facility->id,
                'tool_id' => $tool->id,
                'count' => 5,
                'mean' => 3.50,
                'standard_deviation' => 0.05,
                'normal_min' => 2.50,
                'normal_max' => 4.50,
                'scenario' => 'possible_water_leak',
            ])
            ->assertCreated()
            ->assertJsonPath('summary.generated', 5);

        $this->assertSame(5, SensorReading::query()->count());

        $detectResponse = $this
            ->actingAs($user)
            ->postJson('/api/simulation/detect', [
                'facility_id' => $facility->id,
                'tool_id' => $tool->id,
                'scenario' => 'possible_water_leak',
            ]);

        $detectResponse
            ->assertOk()
            ->assertJsonPath('alert.alert_type', 'possible_water_leak');

        $this->assertSame(1, Alert::query()->count());
    }
}
