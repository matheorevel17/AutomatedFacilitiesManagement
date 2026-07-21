<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\AutomatedTool;
use App\Models\Facility;
use App\Models\MaintenanceTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NonDestructiveActionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_delete_routes_mark_records_inactive_or_resolved_without_removing_data(): void
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
        $alert = Alert::query()->create([
            'facility_id' => $facility->id,
            'tool_id' => $tool->id,
            'triggered_at' => now(),
            'alert_type' => 'possible_water_leak',
            'severity' => 'high',
            'message' => 'Pressure is below normal range.',
            'status' => 'open',
        ]);
        $task = MaintenanceTask::query()->create([
            'alert_id' => $alert->id,
            'facility_id' => $facility->id,
            'tool_id' => $tool->id,
            'title' => 'Inspect pump pressure',
            'description' => 'Check pressure sensor and pump valve.',
            'assigned_to_user_id' => $user->id,
            'status' => 'pending',
            'priority' => 'high',
        ]);

        $this->actingAs($user)->deleteJson("/api/facilities/{$facility->id}")->assertOk();
        $this->actingAs($user)->deleteJson("/api/automated-tools/{$tool->id}")->assertOk();
        $this->actingAs($user)->deleteJson("/api/alerts/{$alert->id}")->assertOk();
        $this->actingAs($user)->deleteJson("/api/maintenance-tasks/{$task->id}")->assertOk();

        $this->assertDatabaseHas('facilities', [
            'id' => $facility->id,
            'status' => 'inactive',
        ]);
        $this->assertDatabaseHas('automated_tools', [
            'id' => $tool->id,
            'status' => 'inactive',
        ]);
        $this->assertDatabaseHas('alerts', [
            'id' => $alert->id,
            'status' => 'resolved',
        ]);
        $this->assertDatabaseHas('maintenance_tasks', [
            'id' => $task->id,
            'status' => 'resolved',
        ]);
    }
}
