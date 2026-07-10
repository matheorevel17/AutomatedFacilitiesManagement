<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tool_id', 'recorded_at', 'value', 'unit', 'status'])]
class SensorReading extends Model
{
    protected $table = 'sensor_data';

    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
            'value' => 'decimal:2',
        ];
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(AutomatedTool::class, 'tool_id');
    }
}
