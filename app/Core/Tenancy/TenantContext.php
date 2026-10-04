<?php

namespace App\Core\Tenancy;

use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;

class TenantContext
{
    private ?Tenant $tenant = null;

    private ?Branch $branch = null;

    private bool $isPlatformMode = false;

    public function setTenant(?Tenant $tenant): self
    {
        $this->tenant = $tenant;

        return $this;
    }

    public function getTenant(): ?Tenant
    {
        return $this->tenant;
    }

    public function getTenantId(): ?string
    {
        return $this->tenant?->id;
    }

    public function setBranch(?Branch $branch): self
    {
        $this->branch = $branch;

        return $this;
    }

    public function getBranch(): ?Branch
    {
        return $this->branch;
    }

    public function getBranchId(): ?string
    {
        return $this->branch?->id;
    }

    public function setPlatformMode(bool $mode = true): self
    {
        $this->isPlatformMode = $mode;

        return $this;
    }

    public function isPlatformMode(): bool
    {
        return $this->isPlatformMode;
    }

    public function hasTenant(): bool
    {
        return $this->tenant !== null;
    }

    public function clear(): void
    {
        $this->tenant = null;
        $this->branch = null;
        $this->isPlatformMode = false;
    }
}
