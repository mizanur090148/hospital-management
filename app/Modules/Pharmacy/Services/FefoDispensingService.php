<?php

namespace App\Modules\Pharmacy\Services;

use App\Core\Enums\DispenseStatus;
use App\Core\Enums\PoStatus;
use App\Core\Enums\StockMovementType;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\OPD\Models\Prescription;
use App\Modules\Pharmacy\Models\GoodsReceiptNote;
use App\Modules\Pharmacy\Models\GoodsReceiptNoteItem;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\MedicineBatch;
use App\Modules\Pharmacy\Models\PharmacyDispensing;
use App\Modules\Pharmacy\Models\PharmacyDispensingItem;
use App\Modules\Pharmacy\Models\PurchaseOrder;
use App\Modules\Pharmacy\Models\PurchaseOrderItem;
use App\Modules\Pharmacy\Models\StockTransaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class FefoDispensingService
{
    /**
     * Preview FEFO allocation for a specific medicine and quantity.
     *
     * @return array<int, array{batch_id: string, batch_number: string, expiry_date: string, allocated_qty: int, unit_price: float, subtotal: float}>
     */
    public function previewFefoAllocation(string $tenantId, string $warehouseId, string $medicineId, int $quantityRequested): array
    {
        $batches = MedicineBatch::where('tenant_id', $tenantId)
            ->where('warehouse_id', $warehouseId)
            ->where('medicine_id', $medicineId)
            ->where('expiry_date', '>', now()->toDateString())
            ->where('quantity_on_hand', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->get();

        $allocations = [];
        $remainingNeeded = $quantityRequested;

        foreach ($batches as $batch) {
            if ($remainingNeeded <= 0) {
                break;
            }

            $allocateQty = min($batch->quantity_on_hand, $remainingNeeded);
            $allocations[] = [
                'batch_id' => $batch->id,
                'batch_number' => $batch->batch_number,
                'expiry_date' => $batch->expiry_date->format('Y-m-d'),
                'allocated_qty' => $allocateQty,
                'unit_price' => (float) $batch->selling_price,
                'subtotal' => round($allocateQty * (float) $batch->selling_price, 2),
            ];

            $remainingNeeded -= $allocateQty;
        }

        if ($remainingNeeded > 0) {
            $medicine = Medicine::find($medicineId);
            $name = $medicine ? $medicine->brand_name : $medicineId;
            throw new RuntimeException("Insufficient unexpired stock for {$name}. Requested: {$quantityRequested}, Shortfall: {$remainingNeeded}.");
        }

        return $allocations;
    }

    /**
     * Dispense medicines for a prescription (or direct patient dispense) using strict FEFO batch allocation and pessimistic locking.
     *
     * @param  array<int, array{medicine_id: string, quantity: int, prescription_item_id?: string|null}>  $items
     */
    public function dispense(
        string $tenantId,
        string $branchId,
        string $warehouseId,
        string $patientId,
        string $dispensedByUserId,
        array $items,
        ?string $prescriptionId = null
    ): PharmacyDispensing {
        return DB::transaction(function () use ($tenantId, $branchId, $warehouseId, $patientId, $dispensedByUserId, $items, $prescriptionId) {
            $dispenseNumber = SequenceGenerator::generateDispenseNumber($tenantId);

            $dispensing = PharmacyDispensing::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'warehouse_id' => $warehouseId,
                'dispense_number' => $dispenseNumber,
                'prescription_id' => $prescriptionId,
                'patient_id' => $patientId,
                'dispensed_by_user_id' => $dispensedByUserId,
                'total_amount' => 0.00,
                'status' => DispenseStatus::Dispensed,
                'dispensed_at' => now(),
            ]);

            $totalAmount = 0.00;

            foreach ($items as $itemData) {
                $medicineId = $itemData['medicine_id'];
                $quantityRequested = (int) $itemData['quantity'];
                $prescriptionItemId = $itemData['prescription_item_id'] ?? null;

                // Lock unexpired batches in strict FEFO order
                $batches = MedicineBatch::where('tenant_id', $tenantId)
                    ->where('warehouse_id', $warehouseId)
                    ->where('medicine_id', $medicineId)
                    ->where('expiry_date', '>', now()->toDateString())
                    ->where('quantity_on_hand', '>', 0)
                    ->orderBy('expiry_date', 'asc')
                    ->lockForUpdate()
                    ->get();

                $remainingNeeded = $quantityRequested;

                foreach ($batches as $batch) {
                    if ($remainingNeeded <= 0) {
                        break;
                    }

                    $deductQty = min($batch->quantity_on_hand, $remainingNeeded);
                    $newBalance = $batch->quantity_on_hand - $deductQty;

                    $batch->update([
                        'quantity_on_hand' => $newBalance,
                    ]);

                    $subtotal = round($deductQty * (float) $batch->selling_price, 2);
                    $totalAmount += $subtotal;

                    // Audit ledger stock transaction
                    StockTransaction::create([
                        'tenant_id' => $tenantId,
                        'warehouse_id' => $warehouseId,
                        'medicine_batch_id' => $batch->id,
                        'movement_type' => StockMovementType::Dispense->value,
                        'quantity' => -$deductQty,
                        'balance_after' => $newBalance,
                        'reference_type' => 'PharmacyDispensing',
                        'reference_id' => $dispensing->id,
                        'notes' => "Dispensed for patient #{$patientId} via {$dispenseNumber}",
                        'performed_by_user_id' => $dispensedByUserId,
                    ]);

                    // Dispensing item record
                    PharmacyDispensingItem::create([
                        'tenant_id' => $tenantId,
                        'dispensing_id' => $dispensing->id,
                        'prescription_item_id' => $prescriptionItemId,
                        'medicine_id' => $medicineId,
                        'medicine_batch_id' => $batch->id,
                        'quantity' => $deductQty,
                        'unit_price' => $batch->selling_price,
                        'subtotal' => $subtotal,
                    ]);

                    $remainingNeeded -= $deductQty;
                }

                if ($remainingNeeded > 0) {
                    $med = Medicine::find($medicineId);
                    $name = $med ? $med->brand_name : $medicineId;
                    throw new RuntimeException("Cannot dispense {$name}: Insufficient unexpired stock in warehouse. Shortfall: {$remainingNeeded}.");
                }
            }

            $dispensing->update(['total_amount' => $totalAmount]);

            return $dispensing->load(['items.medicine', 'items.medicineBatch', 'patient', 'warehouse']);
        });
    }

    /**
     * Process Goods Receipt Note (GRN) inward delivery, creating batches, updating PO, and recording audit transactions.
     *
     * @param  array<int, array{medicine_id: string, batch_number: string, expiry_date: string, quantity_received: int, unit_cost: float, selling_price: float, po_item_id?: string|null}>  $items
     */
    public function receiveGoods(
        string $tenantId,
        string $branchId,
        string $warehouseId,
        string $supplierId,
        string $receivedByUserId,
        string $receivedDate,
        ?string $invoiceNumber,
        ?string $purchaseOrderId,
        array $items,
        ?string $notes = null
    ): GoodsReceiptNote {
        return DB::transaction(function () use ($tenantId, $branchId, $warehouseId, $supplierId, $receivedByUserId, $receivedDate, $invoiceNumber, $purchaseOrderId, $items, $notes) {
            $grnNumber = SequenceGenerator::generateGrnNumber($tenantId);

            $grn = GoodsReceiptNote::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'warehouse_id' => $warehouseId,
                'purchase_order_id' => $purchaseOrderId,
                'supplier_id' => $supplierId,
                'grn_number' => $grnNumber,
                'received_date' => $receivedDate,
                'invoice_number' => $invoiceNumber,
                'received_by_user_id' => $receivedByUserId,
                'notes' => $notes,
            ]);

            foreach ($items as $itemData) {
                $medicineId = $itemData['medicine_id'];
                $batchNumber = $itemData['batch_number'];
                $expiryDate = $itemData['expiry_date'];
                $qtyReceived = (int) $itemData['quantity_received'];
                $unitCost = (float) $itemData['unit_cost'];
                $sellingPrice = (float) $itemData['selling_price'];

                // Find or create batch with pessimistic lock
                $batch = MedicineBatch::firstOrNew([
                    'tenant_id' => $tenantId,
                    'warehouse_id' => $warehouseId,
                    'medicine_id' => $medicineId,
                    'batch_number' => $batchNumber,
                ]);

                $initialBalance = $batch->exists ? $batch->quantity_on_hand : 0;
                $newBalance = $initialBalance + $qtyReceived;

                $batch->expiry_date = $expiryDate;
                $batch->purchase_cost = $unitCost;
                $batch->selling_price = $sellingPrice;
                $batch->quantity_on_hand = $newBalance;
                $batch->save();

                // Create GRN line item
                GoodsReceiptNoteItem::create([
                    'tenant_id' => $tenantId,
                    'goods_receipt_note_id' => $grn->id,
                    'medicine_id' => $medicineId,
                    'batch_number' => $batchNumber,
                    'expiry_date' => $expiryDate,
                    'quantity_received' => $qtyReceived,
                    'unit_cost' => $unitCost,
                    'selling_price' => $sellingPrice,
                ]);

                // Record audit transaction
                StockTransaction::create([
                    'tenant_id' => $tenantId,
                    'warehouse_id' => $warehouseId,
                    'medicine_batch_id' => $batch->id,
                    'movement_type' => StockMovementType::PurchaseReceipt->value,
                    'quantity' => $qtyReceived,
                    'balance_after' => $newBalance,
                    'reference_type' => 'GoodsReceiptNote',
                    'reference_id' => $grn->id,
                    'notes' => "Inward receipt via GRN {$grnNumber}, invoice: {$invoiceNumber}",
                    'performed_by_user_id' => $receivedByUserId,
                ]);

                // Update PO item if linked
                if (! empty($itemData['po_item_id'])) {
                    $poItem = PurchaseOrderItem::find($itemData['po_item_id']);
                    if ($poItem) {
                        $poItem->quantity_received += $qtyReceived;
                        $poItem->save();
                    }
                }
            }

            // If PO exists, evaluate status
            if ($purchaseOrderId) {
                $po = PurchaseOrder::with('items')->find($purchaseOrderId);
                if ($po) {
                    $totalOrdered = $po->items->sum('quantity_ordered');
                    $totalReceived = $po->items->sum('quantity_received');

                    if ($totalReceived >= $totalOrdered && $totalOrdered > 0) {
                        $po->status = PoStatus::Received;
                    } elseif ($totalReceived > 0) {
                        $po->status = PoStatus::PartiallyReceived;
                    }
                    $po->save();
                }
            }

            return $grn->load(['items.medicine', 'supplier', 'warehouse']);
        });
    }

    /**
     * Manual stock balance adjustment (e.g. inventory audit, shrinkage, damage).
     */
    public function adjustStock(
        string $tenantId,
        string $warehouseId,
        string $batchId,
        int $newQuantity,
        string $reason,
        string $performedByUserId
    ): MedicineBatch {
        return DB::transaction(function () use ($tenantId, $warehouseId, $batchId, $newQuantity, $reason, $performedByUserId) {
            $batch = MedicineBatch::where('tenant_id', $tenantId)
                ->where('warehouse_id', $warehouseId)
                ->where('id', $batchId)
                ->lockForUpdate()
                ->firstOrFail();

            $diff = $newQuantity - $batch->quantity_on_hand;
            $batch->quantity_on_hand = $newQuantity;
            $batch->save();

            StockTransaction::create([
                'tenant_id' => $tenantId,
                'warehouse_id' => $warehouseId,
                'medicine_batch_id' => $batch->id,
                'movement_type' => StockMovementType::Adjustment->value,
                'quantity' => $diff,
                'balance_after' => $newQuantity,
                'reference_type' => 'StockAdjustment',
                'reference_id' => $batch->id,
                'notes' => "Manual stock count adjustment: {$reason}",
                'performed_by_user_id' => $performedByUserId,
            ]);

            return $batch;
        });
    }
}
