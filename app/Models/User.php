<?php

namespace App\Models;

use App\Modules\Auth\Models\User as BaseUser;

class User extends BaseUser
{
    // Inherits enterprise User model with Tenancy, RBAC, and Audit capabilities
}
