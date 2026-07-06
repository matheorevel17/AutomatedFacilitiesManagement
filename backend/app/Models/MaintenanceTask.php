<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'alert_id',
    'facility_id',
    'tool_id',
    'title',
    'description',
    'assigned_to_user_id',
    'status',
    'priority',
    'resolved_at',
])]
class MaintenanceTask extends Model
{
    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(Alert::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function tool(): BelongsTo
    {
        return $this->belongsTo(AutomatedTool::class, 'tool_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_user_id');
    }
}
