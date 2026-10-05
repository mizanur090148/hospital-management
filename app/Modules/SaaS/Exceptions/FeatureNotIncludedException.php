<?php

namespace App\Modules\SaaS\Exceptions;

use Exception;

class FeatureNotIncludedException extends Exception
{
    public function __construct(
        public string $featureKey,
        public ?string $planName = null
    ) {
        $message = "The feature '{$featureKey}' is not included in your current subscription plan ({$planName}). Upgrade your plan to access this capability.";
        parent::__construct($message, 403);
    }
}
