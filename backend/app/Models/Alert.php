<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'facility_id',
    'tool_id',
    'triggered_at',
    'alert_type',
    'severity',
    'message',
    'status',
])]
class Alert extends Model
{
    protected function casts(): array
    {
        return [
            'triggered_at' => 'datetime',
        ];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(AutomatedTool::class, 'tool_id');
    }

    public function maintenanceTasks(): HasMany
    {
        return $this->hasMany(MaintenanceTask::class);
    }
}
