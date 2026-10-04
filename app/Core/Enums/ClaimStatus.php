<?php

namespace App\Core\Enums;

enum ClaimStatus: string
{
    case Submitted = 'SUBMITTED';
    case InReview = 'IN_REVIEW';
    case Approved = 'APPROVED';
    case PartiallyApproved = 'PARTIALLY_APPROVED';
    case Rejected = 'REJECTED';
    case Settled = 'SETTLED';

    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Submitted to Insurer',
            self::InReview => 'Under Review',
            self::Approved => 'Approved in Full',
            self::PartiallyApproved => 'Partially Approved',
            self::Rejected => 'Rejected / Denied',
            self::Settled => 'Payment Settled',
        };
    }
}
