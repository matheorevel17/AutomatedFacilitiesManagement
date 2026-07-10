<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'facility_id',
    'name',
    'type',
    'location',
    'normal_min',
    'normal_max',
    'unit',
    'status',
    'installation_date',
])]
class AutomatedTool extends Model
{
    protected function casts(): array
    {
        return [
            'normal_min' => 'decimal:2',
            'normal_max' => 'decimal:2',
            'installation_date' => 'date',
        ];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function sensorData(): HasMany
    {
        return $this->hasMany(SensorReading::class, 'tool_id');
    }

    public function latestSensorReading(): HasOne
    {
        return $this->hasOne(SensorReading::class, 'tool_id')->latestOfMany('recorded_at');
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class, 'tool_id');
    }

    public function maintenanceTasks(): HasMany
    {
        return $this->hasMany(MaintenanceTask::class, 'tool_id');
    }
}
