<?php

namespace App\Modules\Opd\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionItem extends Model
{
    use HasUuids;

    protected $table = 'prescription_items';

    protected $fillable = [
        'prescription_id',
        'medicine_name',
        'dosage',
        'frequency',
        'route',
        'duration_days',
        'instructions',
        'total_quantity',
    ];

    protected $casts = [
        'duration_days' => 'integer',
        'total_quantity' => 'integer',
    ];

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class, 'prescription_id');
    }
}
