<?php

namespace App\Modules\Appointment\Services;

use App\Core\Enums\AppointmentStatus;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Clinical\Models\DoctorSchedule;
use Carbon\Carbon;

class AppointmentSlotEngine
{
    /**
     * Generate all time slots and their availability for a doctor on a given date.
     *
     * @return array<int, array{start_time: string, end_time: string, is_available: bool, appointment_id: ?string}>
     */
    public function getSlots(string $doctorId, string $date): array
    {
        $carbonDate = Carbon::parse($date);
        $dayOfWeek = $carbonDate->dayOfWeekIso; // 1 (Monday) to 7 (Sunday)

        $schedule = DoctorSchedule::where('doctor_id', $doctorId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (! $schedule) {
            return [];
        }

        $existingAppointments = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->where('status', '!=', AppointmentStatus::Cancelled->value)
            ->get()
            ->keyBy(function (Appointment $appointment) {
                return Carbon::parse($appointment->start_time)->format('H:i');
            });

        $slots = [];
        $startTime = Carbon::parse($schedule->start_time);
        $endTime = Carbon::parse($schedule->end_time);
        $duration = $schedule->slot_duration_minutes ?: 15;

        while ($startTime->copy()->addMinutes($duration)->lte($endTime)) {
            $slotStart = $startTime->format('H:i');
            $slotEnd = $startTime->copy()->addMinutes($duration)->format('H:i');

            $isBooked = $existingAppointments->has($slotStart);
            $appointment = $isBooked ? $existingAppointments->get($slotStart) : null;

            $slots[] = [
                'start_time' => $slotStart,
                'end_time' => $slotEnd,
                'is_available' => ! $isBooked,
                'appointment_id' => $appointment?->id,
            ];

            $startTime->addMinutes($duration);
        }

        return $slots;
    }

    /**
     * Check if a specific slot is available.
     */
    public function isSlotAvailable(string $doctorId, string $date, string $startTime): bool
    {
        $normalizedTime = Carbon::parse($startTime)->format('H:i:s');

        $exists = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->whereTime('start_time', $normalizedTime)
            ->where('status', '!=', AppointmentStatus::Cancelled->value)
            ->exists();

        return ! $exists;
    }
}
