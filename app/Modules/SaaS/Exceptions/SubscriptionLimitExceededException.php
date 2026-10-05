<?php

namespace App\Modules\SaaS\Exceptions;

use Exception;

class SubscriptionLimitExceededException extends Exception
{
    public function __construct(
        public string $resourceType,
        public int $currentUsage,
        public int $quotaLimit,
        public ?string $planName = null
    ) {
        $message = "Subscription limit exceeded for '{$resourceType}'. Current usage ({$currentUsage}) has reached the maximum capacity of {$quotaLimit} allowed on your {$planName} plan. Please upgrade your subscription tier.";
        parent::__construct($message, 403);
    }
}
