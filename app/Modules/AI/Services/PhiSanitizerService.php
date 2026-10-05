<?php

namespace App\Modules\AI\Services;

use App\Modules\Patient\Models\Patient;

class PhiSanitizerService
{
    /**
     * Sanitize Protected Health Information (PHI) & PII from raw clinical text before LLM dispatch.
     *
     * Replaces identifying tokens with reversible placeholders.
     */
    public function sanitize(string $text, ?Patient $patient = null): array
    {
        $redactionMap = [];

        // 1. Redact Email addresses first (to prevent first/last names from splitting email usernames)
        $text = preg_replace_callback('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', function ($matches) use (&$redactionMap) {
            $token = '[EMAIL_'.(count($redactionMap) + 1).']';
            $redactionMap[$token] = $matches[0];

            return $token;
        }, $text);

        // 2. Redact explicit Patient identifiers (MRN & Phone)
        if ($patient) {
            if ($patient->mrn) {
                $placeholder = '[PATIENT_MRN]';
                $redactionMap[$placeholder] = $patient->mrn;
                $text = preg_replace('/\b'.preg_quote($patient->mrn, '/').'\b/i', $placeholder, $text);
            }

            if ($patient->phone) {
                $placeholder = '[PATIENT_PHONE]';
                $redactionMap[$placeholder] = $patient->phone;
                $text = str_replace($patient->phone, $placeholder, $text);
            }
        }

        // 3. Redact generic Phone numbers (US, international formats)
        $text = preg_replace_callback('/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/', function ($matches) use (&$redactionMap) {
            $token = '[PHONE_'.(count($redactionMap) + 1).']';
            $redactionMap[$token] = $matches[0];

            return $token;
        }, $text);

        // 4. Redact SSN / National Identification (9 digits)
        $text = preg_replace_callback('/\b\d{3}-\d{2}-\d{4}\b/', function ($matches) use (&$redactionMap) {
            $token = '[SSN_'.(count($redactionMap) + 1).']';
            $redactionMap[$token] = $matches[0];

            return $token;
        }, $text);

        // 5. Redact Patient names
        if ($patient) {
            if ($patient->first_name) {
                $placeholder = '[PATIENT_FIRST_NAME]';
                $redactionMap[$placeholder] = $patient->first_name;
                $text = preg_replace('/\b'.preg_quote($patient->first_name, '/').'\b/i', $placeholder, $text);
            }

            if ($patient->last_name) {
                $placeholder = '[PATIENT_LAST_NAME]';
                $redactionMap[$placeholder] = $patient->last_name;
                $text = preg_replace('/\b'.preg_quote($patient->last_name, '/').'\b/i', $placeholder, $text);
            }
        }

        return [
            'sanitized_text' => $text,
            'redaction_map' => $redactionMap,
        ];
    }

    /**
     * Rehydrate sanitized text by restoring original patient names & identifiers.
     */
    public function rehydrate(string $text, array $redactionMap): string
    {
        foreach ($redactionMap as $placeholder => $originalValue) {
            $text = str_replace($placeholder, $originalValue, $text);
        }

        return $text;
    }
}
