import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { User } from '@midnite/shared';
import { UsersRepository } from './users.repository';

const BCRYPT_ROUNDS = 12;

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`user with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class UserDoesNotExistError extends Error {
  constructor(id: string) {
    super(`user ${id} not found`);
    this.name = 'UserDoesNotExistError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly repo: UsersRepository) {}

  async register(email: string, name: string, password: string): Promise<User> {
    const existing = this.repo.findByEmail(email.toLowerCase());
    if (existing) throw new UserAlreadyExistsError(email);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();
    const row = this.repo.insert({
      id: randomUUID(),
      email: email.toLowerCase(),
      name: name.trim(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    this.logger.log(`user registered: ${row.id}`);
    return this.repo.hydrate(row);
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const row = this.repo.findByEmail(email.toLowerCase());
    if (!row) throw new InvalidCredentialsError();
    const match = await bcrypt.compare(password, row.passwordHash);
    if (!match) throw new InvalidCredentialsError();
    return this.repo.hydrate(row);
  }

  getUser(id: string): User {
    const row = this.repo.findById(id);
    if (!row) throw new UserDoesNotExistError(id);
    return this.repo.hydrate(row);
  }

  async updateProfile(id: string, name?: string): Promise<User> {
    const row = this.repo.updateProfile(id, { name, updatedAt: new Date().toISOString() });
    if (!row) throw new UserDoesNotExistError(id);
    return this.repo.hydrate(row);
  }

  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const row = this.repo.findById(id);
    if (!row) throw new UserDoesNotExistError(id);
    const match = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!match) throw new InvalidCredentialsError();
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    this.repo.updatePassword(id, hash, new Date().toISOString());
  }
}
