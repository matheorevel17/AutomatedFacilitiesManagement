<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_account_and_is_authenticated(): void
    {
        $response = $this->postJson('/api/register', [
            'email' => 'new.tech@stagebali.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'new.tech@stagebali.test')
            ->assertJsonPath('user.role', 'technician');

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'new.tech@stagebali.test',
            'name' => 'new.tech',
            'role' => 'technician',
        ]);
    }

    public function test_registration_requires_unique_email(): void
    {
        $this->postJson('/api/register', [
            'email' => 'new.tech@stagebali.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $this->postJson('/api/register', [
            'email' => 'new.tech@stagebali.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable();
    }

    public function test_registration_requires_matching_password_confirmation(): void
    {
        $this->postJson('/api/register', [
            'email' => 'new.tech@stagebali.test',
            'password' => 'password123',
            'password_confirmation' => 'wrong-password',
        ])->assertUnprocessable();
    }
}
