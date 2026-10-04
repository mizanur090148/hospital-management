<?php

namespace App\Core\Enums;

enum StockMovementType: string
{
    case PurchaseReceipt = 'PURCHASE_RECEIPT';
    case Dispense = 'DISPENSE';
    case ReturnToSupplier = 'RETURN_TO_SUPPLIER';
    case PatientReturn = 'PATIENT_RETURN';
    case Adjustment = 'ADJUSTMENT';
    case Transfer = 'TRANSFER';

    public function label(): string
    {
        return match ($this) {
            self::PurchaseReceipt => 'Goods Receipt / Inward PO',
            self::Dispense => 'Prescription Dispensing Outward',
            self::ReturnToSupplier => 'Debit Note Return to Vendor',
            self::PatientReturn => 'Unused Medicine Patient Return',
            self::Adjustment => 'Physical Audit Stock Adjustment',
            self::Transfer => 'Inter-Warehouse Transfer',
        };
    }
}
